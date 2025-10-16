packer {
  required_plugins {
    amazon = {
      source  = "github.com/hashicorp/amazon"
      version = "~> 1.3.0"
    }
  }
}

variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "source_ami" {
  type    = string
  default = "ami-0866a3c8686eaeeba" # Ubuntu 24.04 LTS in us-east-1
}

variable "ssh_username" {
  type    = string
  default = "ubuntu"
}

variable "subnet_id" {
  type    = string
  default = ""
}

variable "instance_type" {
  type    = string
  default = "t2.micro"
}

variable "volume_size" {
  type    = number
  default = 25
}

variable "volume_type" {
  type    = string
  default = "gp2"
}

variable "ami_name" {
  type    = string
  default = "csye6225-webapp-{{timestamp}}"
}

variable "demo_account_id" {
  type    = string
  default = ""
}

locals {
  timestamp = regex_replace(timestamp(), "[- TZ:]", "")
}

source "amazon-ebs" "ubuntu" {
  ami_name      = var.ami_name
  instance_type = var.instance_type
  region        = var.aws_region
  subnet_id     = var.subnet_id

  source_ami_filter {
    filters = {
      name                = "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"
      root-device-type    = "ebs"
      virtualization-type = "hvm"
    }
    most_recent = true
    owners      = ["099720109477"] # Canonical
  }

  ssh_username = var.ssh_username

  launch_block_device_mappings {
    device_name           = "/dev/sda1"
    volume_size           = var.volume_size
    volume_type           = var.volume_type
    delete_on_termination = true
  }

  ami_users = length(var.demo_account_id) > 0 ? [var.demo_account_id] : []

  tags = {
    Name        = var.ami_name
    Environment = "Production"
    Built-By    = "Packer"
    Source-AMI  = "{{ .SourceAMI }}"
    Build-Time  = "{{ timestamp }}"
  }
}

build {
  sources = ["source.amazon-ebs.ubuntu"]

  # Update system packages
  provisioner "shell" {
    inline = [
      "sudo apt-get update",
      "sudo apt-get upgrade -y",
      "sudo apt-get clean"
    ]
  }

  # Install MySQL
  provisioner "shell" {
    script = "scripts/install-mysql.sh"
  }

  # Install Node.js
  provisioner "shell" {
    script = "scripts/install-nodejs.sh"
  }

  # Create user and setup application directory
  provisioner "shell" {
    script = "scripts/setup-user.sh"
  }

  # Copy application files
  provisioner "file" {
    source      = "../"
    destination = "/tmp/webapp"
  }

  # Setup application
  provisioner "shell" {
    script = "scripts/setup-application.sh"
  }

  # Configure systemd service
  provisioner "file" {
    source      = "scripts/webapp.service"
    destination = "/tmp/webapp.service"
  }

  provisioner "shell" {
    inline = [
      "sudo mv /tmp/webapp.service /etc/systemd/system/webapp.service",
      "sudo systemctl daemon-reload",
      "sudo systemctl enable webapp.service"
    ]
  }

  # Final cleanup
  provisioner "shell" {
    inline = [
      "sudo apt-get autoremove -y",
      "sudo apt-get clean",
      "sudo rm -rf /tmp/*"
    ]
  }
}