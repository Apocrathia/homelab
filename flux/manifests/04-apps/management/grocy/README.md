# Grocy

Grocy is a web-based, self-hosted groceries and household management solution for your home. It helps you manage your inventory, plan meals, track chores, and organize your household tasks.

- **GitHub**: [grocy/grocy](https://github.com/grocy/grocy)
- **Documentation**: [grocy.info](https://grocy.info/)
- **Docker Image**: [linuxserver/grocy](https://docs.linuxserver.io/images/docker-grocy/)

## Overview

Grocy provides comprehensive household management capabilities including inventory tracking, meal planning, shopping lists, and chore management through a modern web interface.

## Access

- **URL**: https://grocy.gateway.services.apocrathia.com
- **Authentication**: SSO via Authentik

## Features

- **Inventory Management**: Track groceries and household items with barcode scanning
- **Meal Planning**: Plan meals and generate shopping lists
- **Shopping Lists**: Create and manage shopping lists
- **Chore Management**: Track household chores and tasks
- **Barcode Scanning**: Support for barcode readers and camera scanning
- **REST API**: Full API for integration with other tools
- **Multi-language Support**: Available in multiple languages
- **Mobile-friendly**: Responsive design for mobile devices

See the [official documentation](https://grocy.info/) for complete feature details.

## Configuration

### Storage

- **Type**: Longhorn persistent storage
- **Capacity**: 5Gi
- **Mount Path**: `/config`

### Database

- **Engine**: SQLite (default)
- **Storage**: Included in persistent volume
- **Location**: `/config/database/grocy.db`

### Environment

Grocy is configured through environment variables and the web interface:

#### Core Configuration

- **PUID/PGID**: User and group IDs for file permissions (1000)
- **TZ**: Timezone (America/Denver)
- **GROCY_BASE_URL**: External access URL for proper functionality

#### Web Interface Configuration

After initial setup, configure Grocy through the web interface:

1. Access the application at https://grocy.gateway.services.apocrathia.com
2. Login with default credentials (admin/admin)
3. Navigate to Administration → Settings to configure:
   - Currency and units
   - Barcode prefixes
   - Default shopping list
   - Feature flags
   - And more...

### Security

- SSO authentication via Authentik with proxy auth
- User must be manually created in Authentik before first access
- Default admin credentials should be changed immediately
- All data stored in persistent volume with proper permissions

## Initial Setup

### Prerequisites

1. **Create user in Authentik**: Before accessing Grocy, create a user account in Authentik that will be used for proxy authentication
2. **Ensure Authentik proxy auth is configured**: The application uses Authentik's proxy authentication mode

### Application Setup

1. Access Grocy at https://grocy.gateway.services.apocrathia.com
2. Login with default credentials:
   - **Username**: admin
   - **Password**: admin
3. **Important**: Change the default password immediately
4. Configure your preferences in Administration → Settings
5. Start adding products, locations, and other data

## Usage

### Getting Started

1. **Set up locations**: Define where you store items (fridge, pantry, etc.)
2. **Add products**: Add groceries and household items to your inventory
3. **Configure units**: Set up measurement units (kg, pieces, etc.)
4. **Set up barcodes**: Add barcode information for products
5. **Plan meals**: Use the meal planning feature
6. **Create shopping lists**: Generate lists based on low stock or meal plans

### Key Features

- **Stock Overview**: See current inventory levels
- **Shopping List**: Manage what you need to buy
- **Meal Plan**: Plan meals for the week/month
- **Chores**: Track household tasks
- **Batteries**: Track battery inventory and usage
- **Recipes**: Store and manage recipes

## Integration

### Barcode Scanning

Grocy supports barcode scanning through:

- USB barcode scanners (recommended)
- Mobile device cameras
- Manual barcode entry

### API Access

Grocy provides a full REST API accessible at `/api` with Swagger documentation.

### External Services

Grocy can integrate with external barcode lookup services for automatic product information retrieval.

## Troubleshooting

### Common Issues

1. **Permission errors**: Ensure the `/config` directory has proper permissions
2. **Database issues**: Check that the SQLite database file is accessible
3. **Barcode scanning**: Verify barcode scanner configuration and prefixes

### Logs

Check application logs for troubleshooting:

```bash
kubectl logs -n grocy deployment/grocy
```

## Backup

The application data is stored in the persistent volume. Regular backups are handled by Longhorn's snapshot functionality.

## Updates

Updates are managed through Renovate and applied automatically via Flux. The application will restart when updates are available.
