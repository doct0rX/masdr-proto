output "elastic_ip" {
  value = aws_eip.app.public_ip
}

output "instance_id" {
  value = aws_instance.app.id
}

output "bucket" {
  value = aws_s3_bucket.data.bucket
}

output "godaddy_dns_record" {
  value = "Create at GoDaddy for thegentek.com -> Type A, Host: masdr-proto, Value: ${aws_eip.app.public_ip}, TTL: 600"
}

output "url" {
  value = "https://${var.domain}"
}
