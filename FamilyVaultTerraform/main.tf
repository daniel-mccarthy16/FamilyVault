terraform {
  required_providers {
    github = {
      source  = "integrations/github"
      version = "~> 6.0"
    }
  }
}

provider "github" {
  token        = var.github_token
}

resource "github_repository_webhook" "familyvault_cdk" {
  repository = "daniel-mccarthy16/FamilyVault"
  events     = ["push"]
  configuration {
    url          = "${var.apigateway_webhook_url}/cdk"
    content_type = "json"
    secret       = var.webhook_secret
    insecure_ssl = "0"
  }
}

resource "github_repository_webhook" "familyvault_cicd" {
  repository = "daniel-mccarthy16/FamilyVault"
  events     = ["push"]
  configuration {
    url          = "${var.apigateway_webhook_url}/cicd"
    content_type = "json"
    secret       = var.webhook_secret
    insecure_ssl = "0"
  }
}

resource "github_repository_webhook" "familyvault_react" {
  repository = "daniel-mccarthy16/FamilyVault"
  events     = ["push"]
  configuration {
    url          = "${var.apigateway_webhook_url}/react"
    content_type = "json"
    secret       = var.webhook_secret
    insecure_ssl = "0"
  }
}

//TODO - do i want to do this?
# resource "github_repository_webhook" "familyvault_terraform" {
#   repository = "daniel-mccarthy16/FamilyVault"
#   events     = ["push"]
#   configuration {
#     url          = "https://yourserver.com/webhook/familyvaultterraform"
#     content_type = "json"
#     secret       = var.webhook_secret
#     insecure_ssl = "0"
#   }
# }
