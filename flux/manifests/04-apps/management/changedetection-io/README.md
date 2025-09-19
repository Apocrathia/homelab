# ChangeDetection.io

Website change detection and monitoring service with notification support.

## Overview

ChangeDetection.io monitors websites for content changes and sends notifications when changes are detected. It supports various content filtering options, browser automation for JavaScript-heavy sites, and multiple notification channels.

## Features

- **Content Monitoring**: Monitor websites for text, price, and availability changes
- **Visual Selector**: Point-and-click element selection for monitoring specific page sections
- **Browser Automation**: Full JavaScript support with Browserless Chrome integration
- **Multiple Filters**: CSS selectors, XPath, JSONPath, and regular expressions
- **Notification Channels**: Email, Discord, Telegram, Slack, webhooks, and more
- **Restock Detection**: Specialized monitoring for e-commerce product availability
- **Tag Organization**: Group and manage watches with tags
- **API Access**: REST API for programmatic management

## Configuration

The deployment includes:

- **Base URL**: Configured for external access through the gateway
- **Browser Support**: Integrated with Browserless Chrome sidecar for JavaScript rendering
- **Storage**: 5GB Longhorn volume for data persistence
- **Security**: LinuxServer.io container running as root with browserless sidecar as user 999
- **Authentik Integration**: SSO authentication through Authentik

## Accessing the Service

Access ChangeDetection.io at: https://changedetection.gateway.services.apocrathia.com

Authentication is handled through Authentik SSO.

## Data Persistence

- **Datastore**: All watch configurations, history, and snapshots are stored in `/datastore`
- **Temporary Files**: Writable `/tmp` directory for browserless Chrome processing
- **Volume Size**: 5GB allocated for data storage

## External Dependencies

- **Browserless Chrome**: Provides headless Chrome for JavaScript-heavy websites
- **Authentik**: Handles authentication and authorization
- **Gateway API**: Routes external traffic to the service
