# Terraform Infrastructure Provisioning

This directory contains modular Terraform configurations to provision the AWS cloud infrastructure required to host the Unified Observability Platform.

## ⚠️ CRITICAL COST WARNING
**Always destroy cloud resources immediately when not actively testing to control costs.**
Running these resources can accrue significant AWS bills (particularly EKS Clusters and NAT Gateways).
* **Command to clean up**: Run `terraform destroy` in this directory to tear down all provisioned resources.
* **Nodes constraints**: The default node group runs 2 x `t3.medium` worker instances. A separate load testing node group starts at size `0`.

---

## Remote State Bootstrap
This project uses S3 for state storage and DynamoDB for locking. Before running `terraform init`, you must bootstrap these backend resources:

1. Create the S3 Bucket (make sure to choose a globally unique bucket name):
   ```bash
   aws s3api create-bucket --bucket obs-platform-tf-state --region us-east-1
   aws s3api put-bucket-encryption --bucket obs-platform-tf-state --server-side-encryption-configuration '{"Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "aws:kms"}}]}'
   ```
2. Create the DynamoDB State Locking Table:
   ```bash
   aws dynamodb create-table \
     --table-name obs-platform-tf-locks \
     --attribute-definitions AttributeName=LockID,AttributeType=S \
     --key-schema AttributeName=LockID,KeyType=HASH \
     --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1
   ```

---

## Execution Workflow

1. **Variables Customization**:
   Copy the example variables file:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```
   Edit `terraform.tfvars` with your settings (e.g. AWS region, environment namespace).

2. **Initialize Terraform**:
   Downloads the required hashicorp providers and connects to the S3 remote backend.
   ```bash
   terraform init
   ```

3. **Format and Validate Code**:
   Confirm there are no syntax errors:
   ```bash
   terraform fmt -recursive
   terraform validate
   ```

4. **Review Plan**:
   Perform a dry-run check to verify the resources that will be created:
   ```bash
   terraform plan
   ```

5. **Deploy Infrastructure**:
   **DO NOT RUN THIS** without explicit approval from the project leads.
   ```bash
   terraform apply
   ```

6. **Tear Down Infrastructure**:
   Clean up all billable resources:
   ```bash
   terraform destroy
   ```
