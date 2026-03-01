terraform {
  required_version = ">= 1.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Configure Azure Provider
provider "azurerm" {
  features {}
  skip_provider_registration = true
}

# Add a random acr_suffix to the acr name to make it globally unique.
resource "random_string" "acr_suffix" {
  length  = 6
  upper   = false
  lower   = true
  numeric = true
  special = false
}
locals {
  acr_basename = replace(var.project_name, "-", "") // only letters/numbers
  // keep base to <= 40 so base+6 <= 46 (under 50 char limit)
  acr_name     = "${substr(local.acr_basename, 0, 40)}${random_string.acr_suffix.result}"
}

# Use existing resource group
data "azurerm_resource_group" "main" {
  name = var.resource_group_name
}

# Create Azure Container Registry
resource "azurerm_container_registry" "acr" {
  name                = local.acr_name
  resource_group_name = data.azurerm_resource_group.main.name
  location            = data.azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = true

  tags = {
    environment = terraform.workspace
    project     = var.project_name
  }
}

locals {
  image_full = "${azurerm_container_registry.acr.login_server}/${var.project_name}:${var.docker_image_tag}"
}

# Build and push Docker image using native CLI (BuildKit-compatible)
resource "null_resource" "docker_build_push" {
  triggers = {
    dockerfile = filemd5("${path.module}/../../Dockerfile")
  }

  provisioner "local-exec" {
    environment = {
      ACR_SERVER = azurerm_container_registry.acr.login_server
      ACR_USER   = azurerm_container_registry.acr.admin_username
      ACR_PASS   = azurerm_container_registry.acr.admin_password
    }
    command = <<-EOT
      set -e
      docker build --platform linux/amd64 -t ${local.image_full} -f ${path.module}/../../Dockerfile ${path.module}/../..
      echo "$ACR_PASS" | docker login "$ACR_SERVER" -u "$ACR_USER" --password-stdin
      docker push ${local.image_full}
    EOT
  }

  depends_on = [azurerm_container_registry.acr]
}

# Create Log Analytics Workspace for monitoring
resource "azurerm_log_analytics_workspace" "main" {
  name                = "${var.project_name}-logs"
  location            = data.azurerm_resource_group.main.location
  resource_group_name = data.azurerm_resource_group.main.name
  sku                 = "PerGB2018"
  retention_in_days   = 30

  tags = {
    environment = terraform.workspace
    project     = var.project_name
  }
}

# Create Container App Environment
resource "azurerm_container_app_environment" "main" {
  name                       = "${var.project_name}-env"
  location                   = data.azurerm_resource_group.main.location
  resource_group_name        = data.azurerm_resource_group.main.name
  log_analytics_workspace_id = azurerm_log_analytics_workspace.main.id

  tags = {
    environment = terraform.workspace
    project     = var.project_name
  }
}

# Create Container App
resource "azurerm_container_app" "main" {
  name                         = var.project_name
  container_app_environment_id = azurerm_container_app_environment.main.id
  resource_group_name          = data.azurerm_resource_group.main.name
  revision_mode                = "Single"

  depends_on = [null_resource.docker_build_push]

  template {
    container {
      name   = "main"
      image  = local.image_full
      cpu    = 1.0
      memory = "2.0Gi"

      env {
        name        = "OPENAI_API_KEY"
        secret_name = "openai-api-key"
      }

      env {
        name        = "SEMGREP_APP_TOKEN"
        secret_name = "semgrep-app-token"
      }

      env {
        name  = "ENVIRONMENT"
        value = "production"
      }


      env {
        name  = "PYTHONUNBUFFERED"
        value = "1"
      }
    }

    min_replicas = 1
    max_replicas = 1
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }

  registry {
    server   = azurerm_container_registry.acr.login_server
    username = azurerm_container_registry.acr.admin_username
    password_secret_name = "registry-password"
  }

  secret {
    name  = "registry-password"
    value = azurerm_container_registry.acr.admin_password
  }

  secret {
    name  = "openai-api-key"
    value = var.openai_api_key
  }

  secret {
    name  = "semgrep-app-token"
    value = var.semgrep_app_token
  }

  tags = {
    environment = terraform.workspace
    project     = var.project_name
  }
}

# Outputs
output "app_url" {
  value       = "https://${azurerm_container_app.main.ingress[0].fqdn}"
  description = "URL of the deployed application"
}

output "acr_login_server" {
  value       = azurerm_container_registry.acr.login_server
  description = "Azure Container Registry login server"
}

output "resource_group" {
  value       = data.azurerm_resource_group.main.name
  description = "Resource group name"
}
