variable "project" {
  type    = string
  default = "masdr-proto"
}

variable "region" {
  type    = string
  default = "eu-west-1"
}

variable "aws_profile" {
  type        = string
  description = "AWS CLI profile holding the deployer credentials"
  default     = "masdr"
}

variable "domain" {
  type    = string
  default = "masdr-proto.thegentek.com"
}

variable "instance_type" {
  type    = string
  default = "t3.small"
}

variable "root_volume_gb" {
  type    = number
  default = 24
}

variable "ssm_prefix" {
  type        = string
  description = "SSM Parameter Store prefix that holds ANTHROPIC_API_KEY and ACCESS_CODE (SecureString, written with the CLI, never by Terraform)"
  default     = "/masdr-proto"
}

variable "acme_email" {
  type        = string
  description = "Contact email for Let's Encrypt via Caddy"
  default     = "ops@thegentek.com"
}
