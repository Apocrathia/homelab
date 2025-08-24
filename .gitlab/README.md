# GitLab CI/CD Pipeline Documentation

This directory contains the GitLab CI/CD configuration files for the homelab project.

## 📁 Pipeline Structure

### Main Pipeline File

- **`.gitlab-ci.yml`** - Main pipeline configuration that orchestrates all jobs

### Pipeline Components

- **`.gitlab/renovate.gitlab-ci.yml`** - Automated dependency updates using Renovate
- **`.gitlab/no-op.gitlab-ci.yml`** - Placeholder pipeline for testing
- **`.gitlab/chart-tag.gitlab-ci.yml`** - Chart versioning and Git tagging (currently included but can be removed if not needed)

## 🔄 Pipeline Stages

The main pipeline defines these stages:

1. **test** - Validation and testing
2. **verify** - Additional verification steps
3. **tag** - Version tagging and releases
4. **renovate** - Dependency management

## 📋 Individual Pipeline Files

### 1. Renovate Pipeline (`.gitlab/renovate.gitlab-ci.yml`)

**Purpose**: Automatically updates dependencies and creates merge requests

**Configuration**:

```yaml
.renovate:
  image:
    name: ghcr.io/renovatebot/renovate:41.82.9
  script:
    - renovate

renovate:
  extends: .renovate
  stage: renovate
  resource_group: production
  variables:
    RENOVATE_CONFIG_FILE: renovate.json
    RENOVATE_AUTODISCOVER: "true"
    RENOVATE_ONBOARDING: "false"
    RENOVATE_SCHEDULE_NAME: "hourly"
```

**Key Features**:

- Runs on a schedule (hourly)
- Uses resource group to prevent parallel executions
- Creates merge requests for dependency updates
- Respects the configuration in `renovate.json`

### 2. No-Op Pipeline (`.gitlab/no-op.gitlab-ci.yml`)

**Purpose**: Minimal pipeline for testing CI/CD setup

**Use Cases**:

- Testing GitLab CI/CD connectivity
- Validating pipeline triggers
- Placeholder when other pipelines are disabled

### 3. Chart Tag Pipeline (`.gitlab/chart-tag.gitlab-ci.yml`)

**Purpose**: Automated Git tagging for Helm chart versions

**Status**: Currently included in main pipeline but can be disabled

**Configuration**:

```yaml
create-chart-tag:
  stage: tag
  image: alpine:latest
  script:
    -  # Extract version from helm/generic-app/Chart.yaml
    -  # Create Git tag: generic-app-X.Y.Z
    -  # Push tag to repository
  only:
    changes:
      - helm/generic-app/Chart.yaml
  when: manual
```

**Use Cases**:

- Automatic versioning when chart versions are bumped
- Integration with renovate for chart dependency tracking
- Release management for Helm charts

**Note**: This pipeline is currently enabled but set to manual trigger. To disable it completely, remove the include statement from `.gitlab-ci.yml`.

## 🚀 How to Trigger Pipelines

### Automatic Triggers

- **Push to main branch** - Triggers full pipeline
- **Merge request creation** - Triggers pipeline on MR branch
- **Scheduled** - Renovate runs on hourly schedule

### Manual Triggers

1. Go to **Project → CI/CD → Pipelines**
2. Click **"Run pipeline"**
3. Select branch and variables (if needed)

### Trigger Specific Jobs

```bash
# Using GitLab API
curl -X POST \
  --header "PRIVATE-TOKEN: YOUR_TOKEN" \
  "https://gitlab.com/api/v4/projects/YOUR_PROJECT_ID/jobs/JOB_ID/play"
```

## ⚙️ Pipeline Configuration

### Variables

The pipelines use these key variables:

- `RENOVATE_CONFIG_FILE` - Path to renovate configuration
- `RENOVATE_AUTODISCOVER` - Enable automatic repository discovery
- `RENOVATE_SCHEDULE_NAME` - Schedule identifier for Renovate

### Resource Groups

- **production** - Prevents multiple Renovate jobs from running simultaneously
- Ensures only one dependency update process runs at a time

### Artifacts

- **Logs** - Pipeline execution logs (retained for 1 week)
- **Reports** - JUnit test reports when available

## 🔍 Monitoring Pipelines

### GitLab UI

1. **Project → CI/CD → Pipelines** - View all pipeline runs
2. **Project → CI/CD → Jobs** - View individual job executions
3. **Project → CI/CD → Schedules** - Manage pipeline schedules

### Pipeline Status Badges

```markdown
[![pipeline status](https://gitlab.com/Apocrathia/homelab/badges/main/pipeline.svg)](https://gitlab.com/Apocrathia/homelab/-/commits/main)
```

## 🛠️ Troubleshooting

### Common Issues

#### 1. Pipeline Not Starting

```bash
# Check .gitlab-ci.yml syntax
gitlab-ci-lint .gitlab-ci.yml

# Verify branch protection rules
# Project Settings → Repository → Protected branches

# Note: If a stage has no jobs, it will be skipped automatically
# Current stages: test, verify, tag, renovate
# The 'tag' stage may be empty if chart-tag pipeline is disabled
```

#### 2. Renovate Not Running

```bash
# Check if schedule is enabled
# Project → CI/CD → Schedules

# Verify Renovate token permissions
# Personal Access Tokens need 'api' scope
```

#### 3. Job Failures

```bash
# View job logs in GitLab UI
# Project → CI/CD → Jobs → [failed job]

# Check for common issues:
# - Missing dependencies
# - Permission issues
# - Network connectivity
```

### Debug Mode

Add to your pipeline for detailed logging:

```yaml
variables:
  LOG_LEVEL: debug
```

## 📊 Pipeline Analytics

### Metrics to Monitor

- **Pipeline Success Rate** - Percentage of successful runs
- **Average Duration** - Time taken for pipeline completion
- **Failure Patterns** - Common failure points
- **Renovate PR Creation** - Number of dependency updates

### Logs and History

- Pipeline logs are retained for 1 week
- Job artifacts expire after 1 week
- Historical data available in GitLab UI

## 🔒 Security Considerations

### Secrets Management

- Use GitLab CI/CD variables for sensitive data
- Mask sensitive variables in logs
- Rotate tokens regularly

### Permissions

- Limit who can trigger manual pipelines
- Use protected branches for production deployments
- Implement approval rules for sensitive changes

## 📝 Best Practices

### Pipeline Design

1. **Keep it Simple** - Break complex jobs into smaller, focused tasks
2. **Use Templates** - Leverage `.gitlab-ci.yml` includes and extends
3. **Cache Dependencies** - Speed up builds with proper caching
4. **Parallel Execution** - Use `needs` and `dependencies` appropriately
5. **Stage Management** - Remove unused stages from `.gitlab-ci.yml` to keep pipeline clean

### Maintenance

1. **Regular Reviews** - Audit pipeline configurations
2. **Version Control** - Track changes to CI/CD files
3. **Documentation** - Keep this README up to date
4. **Testing** - Test pipeline changes in feature branches
5. **Cleanup** - Remove unused pipeline files and includes

## 🎯 Future Enhancements

### Potential Additions

- **Security Scanning** - Add SAST/DAST jobs
- **Performance Testing** - Load testing pipelines
- **Multi-environment** - Deploy to different environments
- **Notification Integration** - Slack/Discord notifications

### Advanced Features

- **Dynamic Pipelines** - Generate pipelines based on project structure
- **Child Pipelines** - Modular pipeline components
- **Compliance Pipelines** - Security and compliance checks

## 📞 Support

For pipeline issues:

1. Check the troubleshooting section above
2. Review GitLab CI/CD documentation
3. Check project issue tracker
4. Contact the DevOps team

---

_Last updated: $(date)_
_GitLab CI/CD Version: Based on GitLab.com features_
