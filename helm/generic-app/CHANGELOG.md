# Changelog

## Version 0.0.39 (Latest)

- **CRITICAL: Fixed Nil Pointer Error in Longhorn Storage Templates**: Resolved template error when `storage.longhorn.numberOfReplicas` is not explicitly set
  - **Problem Solved**: Template was attempting to access `$.Values.storage.longhorn.numberOfReplicas` without checking if `storage.longhorn` exists, causing "nil pointer evaluating interface {}.storage" errors
  - **Template Fix**: Updated `storage-longhorn.yaml` and `postgres-storage.yaml` to safely check for `storage.longhorn` existence before accessing `numberOfReplicas`
  - **Default Behavior**: Maintains default of 2 replicas when `numberOfReplicas` is not specified
  - **Backward Compatible**: No changes required to existing deployments - this only fixes the template error
  - **Impact**: All HelmReleases using Longhorn storage now render correctly, even when `numberOfReplicas` is not explicitly configured

## Version 0.0.38

- **NEW: Longhorn Volume Replica Configuration**: Added `storage.longhorn.numberOfReplicas` configuration option
  - **Replica Control**: Configure the number of replicas for Longhorn volumes (default: 2)
  - **High Availability**: Increase replicas for better data redundancy and availability
  - **Resource Optimization**: Decrease replicas for storage-constrained environments
  - **Template Integration**: Automatically applied to all Longhorn volumes created by the chart
  - **Backward Compatible**: Defaults to 2 replicas, matching Longhorn's default behavior
  - **Documentation**: Added to values reference table and example configuration

## Version 0.0.37

- **NEW: PostgreSQL Database Support**: Added optional PostgreSQL database deployment using CloudNativePG (CNPG)
  - **Database Integration**: Enable PostgreSQL clusters directly in the chart with `postgres.enabled: true`
  - **CloudNativePG Operator**: Uses CNPG for Kubernetes-native PostgreSQL management with enterprise-grade features
  - **Named Storage Volumes**: Pre-creates Longhorn volumes with meaningful names (`{app-name}-postgres-data`) for better visibility in Longhorn UI
  - **Automatic Services**: CNPG automatically creates read-write and read-only services for database connections
  - **Service Patterns**: Applications connect via `{app-name}-postgres-rw.{namespace}.svc.cluster.local` (read-write) or `{app-name}-postgres-ro.{namespace}.svc.cluster.local` (read-only)
  - **Secret Integration**: Uses same 1Password secrets as the application (`{app-name}-secrets`) with `username` and `password` keys
  - **Configurable Parameters**: Full PostgreSQL configuration parameter support (max_connections, logging, etc.)
  - **Pod Anti-Affinity**: Configurable pod anti-affinity for better performance and high availability
  - **Monitoring Support**: Optional PodMonitor integration for Prometheus metrics (follows CNPG v1.27+ best practices, does not use deprecated `enablePodMonitor`)
  - **Backward Compatible**: Disabled by default, no impact on existing deployments
  - **Documentation**: Comprehensive documentation with connection examples and configuration patterns

## Version 0.0.36

- **CRITICAL: Fixed PersistentVolume Namespace Issue**: Removed invalid namespace field from PersistentVolume metadata
  - **Problem Solved**: PersistentVolumes are cluster-scoped resources and cannot have a namespace field, causing Helm to silently fail creating PVs and PVCs
  - **Impact**: Longhorn volumes were being created but PVs and PVCs were not, preventing pods from mounting storage
  - **Template Fix**: Removed `namespace` field from PersistentVolume metadata in `storage-longhorn.yaml` template
  - **Backward Compatible**: No changes required to existing deployments - this only affects new volume creation
  - **Result**: Helm now successfully creates PersistentVolumes and PersistentVolumeClaims for Longhorn storage

## Version 0.0.35

- **FIXED: Init Container readOnlyRootFilesystem Support**: Added missing `readOnlyRootFilesystem` support for init container security contexts
  - **Problem Solved**: Init containers requiring writable filesystem (e.g., for package installation) couldn't override pod-level read-only setting
  - **Template Enhancement**: Added `readOnlyRootFilesystem` to init container securityContext template rendering
  - **Use Cases**: Enables init containers to install packages (apk, apt, etc.), write temporary files, or perform other filesystem operations
  - **Backward Compatible**: Existing init containers without `readOnlyRootFilesystem` continue to work with default behavior
  - **Documentation**: Updated examples and documentation to include `readOnlyRootFilesystem` configuration

## Version 0.0.34

- **NEW: Authentik Unauthenticated Paths Support**: Added `skipPathRegex` configuration option for bypassing authentik authentication on specific paths
  - **Configuration**: Define regex patterns for paths that should bypass authentik authentication
  - **Use Cases**: Perfect for API endpoints, health checks, public resources, or well-known paths
  - **Blueprint Integration**: Automatically configures `skip_path_regex` in authentik proxy provider blueprint
  - **Backward Compatible**: Defaults to empty array, no impact on existing deployments
  - **Pattern Matching**: Supports multiple regex patterns for flexible path matching
  - **Example Usage**: `skipPathRegex: ["^/$", "^/.well-known/", "^/api/", "^/v1/"]`

## Version 0.0.33

- **NEW: Health Check Probes**: Added optional health check probe support for main containers and sidecars
  - **Liveness Probes**: Detect if container is alive and restart if unhealthy
  - **Readiness Probes**: Detect if container is ready to receive traffic
  - **Startup Probes**: Allow slow-starting containers additional time before liveness/readiness probes take over
  - **Multiple Probe Types**: Support for `httpGet`, `exec`, and `tcpSocket` probe mechanisms
  - **Opt-in by Default**: Probes are disabled by default (`enabled: false`) to ensure zero impact on existing deployments
  - **Sidecar Support**: Health checks can be configured for both main containers and sidecar containers
  - **Flexible Configuration**: All probe fields configurable including timing, thresholds, and probe-specific settings
  - **Backward Compatible**: Existing deployments continue to work unchanged without any probe configuration

## Version 0.0.31

- **Enhanced VPN Sidecar Documentation**: Added comprehensive documentation and examples for VPN sidecar patterns using init containers with `restartPolicy: Always`
  - **New Documentation**: Added dedicated VPN Sidecar Pattern section with generic configuration examples
  - **Generic Examples**: Provided flexible VPN sidecar configuration template applicable to various VPN clients
  - **Best Practices**: Documented key benefits including device access, elevated privileges, persistent connections, and network isolation
  - **Values Examples**: Added commented VPN sidecar example in values.yaml for easy reference
  - **Use Case Coverage**: Covers common VPN scenarios for privacy, compliance, and geo-restricted content access

## Version 0.0.30

- **Authentik Category Control**: Added `authentik.category` configuration option
  - Control application grouping in Authentik dashboard
  - Defaults to "Applications" for backward compatibility
  - Use "Infrastructure", "External", etc. to organize your dashboard

## Version 0.0.29

- **Fixed SMB Volume ReadOnly Configuration**: Resolved issue where SMB volumes were always mounted as read-only regardless of configuration
  - **Problem Solved**: SMB volumes were hardcoded to `readOnly: true` in deployment template, ignoring the `readOnly: false` setting in values
  - **Template Logic Fixed**: Updated deployment template to properly respect the `readOnly` setting from SMB volume configuration
  - **Default Behavior**: Maintains safe default of read-only access when `readOnly` is not specified
  - **Write Access**: Now correctly enables write access when `readOnly: false` is explicitly set
  - **Consistent Pattern**: Uses same semantic pattern (`| default`) as other template configurations

## Version 0.0.27

- **NEW: Init Container restartPolicy Support**: Added support for `restartPolicy` in init containers to enable persistent sidecar-like behavior
  - **Use Case**: Allows init containers to stay running instead of exiting after completion
  - **VPN Support**: Enables VPN containers (like Gluetun) to run as init containers with persistent connections
  - **Device Access**: Retains init container privileges for TUN device creation and elevated security contexts
  - **Template Enhancement**: Added conditional restartPolicy rendering in deployment template
  - **Documentation**: Added comprehensive examples and use cases for restartPolicy feature

## Version 0.0.26

- **CRITICAL: Fixed Sidecar Security Context Inheritance**: Resolved issue where sidecar containers weren't properly applying custom security context settings

  - **Problem Solved**: Sidecar containers were ignoring custom `securityContext` configurations and always falling back to app-level defaults
  - **Template Logic Fixed**: Updated deployment template to properly handle sidecar-specific security context with conditional inheritance
  - **Inheritance Behavior**: Sidecars now correctly inherit from `app.securityContext` when no sidecar-specific context is defined
  - **Override Support**: Sidecars can now override specific security settings while inheriting others from the app level
  - **VPN Container Support**: Enables proper configuration of VPN sidecars (like Gluetun) that require elevated privileges and capabilities

- **Enhanced Documentation**: Added comprehensive sidecar security context documentation with examples and inheritance behavior

## Version 0.0.23

- **CRITICAL: Default Deployment Strategy Changed**: Changed default strategy from RollingUpdate to Recreate to prevent Multi-Attach errors

  - **Problem Solved**: RollingUpdate strategy causes Multi-Attach errors when upgrading apps with persistent volumes, leading to stuck HelmRelease upgrades
  - **New Default**: All apps now use Recreate strategy by default, which eliminates Multi-Attach errors completely
  - **Data Safety**: No data loss - persistent volumes survive pod restarts and maintain all application data
  - **Brief Downtime**: Apps experience ~30-60 seconds of downtime during upgrades (acceptable for homelab use)
  - **Stateless Override**: Stateless apps can explicitly set `strategy: "RollingUpdate"` to maintain zero-downtime updates
  - **Automatic Protection**: New apps with persistent volumes are automatically protected from Multi-Attach errors

- **BREAKING CHANGE: Strategy Configuration**: Deployment strategy now defaults to Recreate instead of RollingUpdate
  - **Migration Required**: Stateless apps must add `strategy: "RollingUpdate"` to maintain zero-downtime updates
  - **Stateful Apps**: No changes needed - automatically get the safe Recreate strategy
  - **Template Logic**: Simplified strategy logic - defaults to Recreate, only uses RollingUpdate when explicitly requested
  - **Documentation**: Updated values.yaml and README with clear guidance on when to use each strategy

## Version 0.0.22

- **ENHANCED: Improved Volume Mount Logic**: Fixed volume mounting to support both local and pod-wide storage simultaneously

  - **Dual Volume Support**: Chart now properly handles both `app.volumes` (local storage) and `app.volumeMounts` (pod-wide storage) in the same deployment
  - **Backward Compatible**: Existing deployments using only `app.volumes` or only `app.volumeMounts` continue to work unchanged
  - **Flexible Configuration**: Applications can now define local storage (emptyDir, configMap) alongside pod-wide storage (Longhorn, SMB) without conflicts
  - **Proper Volume Naming**: Volume names are correctly prefixed with app name for pod-wide storage, while local storage uses names as-is

- **FIXED: Volume Mount Conflicts**: Resolved issues where defining both `app.volumes` and `app.volumeMounts` caused deployment failures
  - **Template Logic Updated**: Chart now processes both volume types independently instead of using either/or logic
  - **Volume Creation**: All volumes (local and pod-wide) are properly created in the deployment
  - **Mount Resolution**: Volume mounts correctly reference their corresponding volumes

## Version 0.0.21

- **MAJOR: Complete Storage Architecture Overhaul**: Redesigned storage system with two-tier architecture

  - **Pod-wide Storage**: Longhorn/SMB volumes defined in `storage` section with `enabled` flags and `volumes` arrays
  - **Container-specific Storage**: EmptyDir/ConfigMap volumes defined in `app.volumes` with mount info included
  - **Consistent Structure**: All storage types now follow the same pattern with explicit `enabled` flags
  - **Enhanced Flexibility**: Container-specific volumes now available for main container, init containers, and sidecars

- **CRITICAL: Fixed Volume Mount Logic**: Resolved completely broken volume mounting system

  - **Fixed Conditional Logic**: Corrected `if .Values.app.volumeMounts` condition that was preventing custom mounts
  - **Proper Volume References**: Volume mounts now correctly reference prefixed volume names
  - **Resolved Mount Errors**: Fixed "volume not found" errors when using custom volume mounts

- **CRITICAL: Fixed Init Container Rendering**: Init containers now render properly

  - **Template Logic Fixed**: Init container template conditions now execute correctly
  - **Volume Mount Support**: Init containers can now mount both pod-wide and container-specific volumes
  - **Environment Variables**: Init container environment variables now render correctly

- **CRITICAL: Fixed Environment Variable Rendering**: Container environment variables now work

  - **Template Execution**: Environment variable loops now execute properly
  - **Value Rendering**: Environment variables from values.yaml now render in deployment

- **Enhanced Container-Specific Volumes**: Extended volume support to all container types

  - **Init Containers**: Can define `volumes.emptyDir` and `volumes.configMap` with mount info
  - **Sidecars**: Can define `volumes.emptyDir` and `volumes.configMap` with mount info
  - **Main Container**: Existing `app.volumes` support maintained and improved

- **Updated Documentation**: Comprehensive documentation overhaul
  - **Storage Architecture**: Clear explanation of pod-wide vs container-specific storage
  - **Usage Examples**: Updated examples showing new structure and capabilities
  - **Volume Naming**: Documented volume naming conventions and patterns

## Version 0.0.20

- **Fixed Volume Processing Logic**: Resolved critical issue where storage volumes weren't being created
  - **Removed Problematic Conditions**: Fixed template conditions that prevented longhorn/SMB volumes from being processed
  - **Direct Volume Processing**: Storage volumes are now processed directly from configuration arrays
  - **Resolved Mount Errors**: Fixed "volume not found" errors when using custom volume mounts
  - **Maintained Override Logic**: Custom volumeMounts still properly override default volumes

## Version 0.0.19

- **Fixed Volume Mount Logic**: Custom `volumeMounts` now properly override default volumes
  - **Clean Volume Configuration**: When `app.volumeMounts` is defined, default nginx volumes are excluded
  - **Fixed Volume Creation**: Longhorn volumes are now properly created in deployment spec
  - **Resolved Mount Errors**: Fixed "volume not found" errors when using custom volume mounts
  - **Improved Flexibility**: Better separation between default and custom volume configurations

## Version 0.0.18

- **BREAKING CHANGE: Multi-Volume Storage Support**: Complete rewrite of storage configuration
  - **New Array-Based Storage**: Define multiple volumes per storage type using simple arrays
  - **Container-Specific Mounting**: Each container specifies which volumes to mount and where
  - **Simplified Configuration**: Remove `enabled` flags and `mountPath` from storage definitions
  - **Consistent Volume Naming**: Volumes automatically prefixed with app name (e.g., `my-app-data`)
  - **Flexible Volume Usage**: Init containers, sidecars, and main containers can all mount different volumes
  - **Migration Required**: Existing deployments must update to new format (see Breaking Changes section)

## Version 0.0.17

- **Fixed Volume Naming Consistency**: Longhorn volume names now match PVC names
  - Volume name changed from hardcoded `app-data` to dynamic `{{ .Values.app.name }}-data`
  - Ensures consistent naming between PVC creation and pod volume references
  - Resolves confusion when referencing volumes in init containers and sidecars

## Version 0.0.16

- **Init Container Support**: Added support for init containers
  - `initContainers`: Configure init containers for setup tasks before main container starts
  - Perfect for fixing volume permissions, database initialization, and dependency setup
  - Full configuration support including security context, volume mounts, and resources
  - Resolves complex permission issues that `fsGroup` alone cannot handle

## Version 0.0.15

- **Enhanced Volume Permission Management**: Added `fsGroupChangePolicy` support
  - `fsGroupChangePolicy`: Automatically change volume ownership when it doesn't match fsGroup
  - Set to `"OnRootMismatch"` to automatically fix volume permissions on mount
  - Essential for applications with persistent volumes that need specific user/group ownership
  - Resolves common permission issues with mounted volumes in Kubernetes

## Version 0.0.14

- **Enhanced Authentik Integration**: Added configurable header-based authentication
  - `interceptHeaderAuth`: Enable/disable header-based authentication for reverse proxy auth
  - Essential for applications like Grocy that use reverse proxy authentication
  - Maintains backward compatibility with existing configurations

## Version 0.0.13

- **Fixed Pod-Level Security Context**: Made pod `runAsNonRoot` configurable instead of hardcoded
  - Resolves conflicts between pod and container security contexts
  - Essential for LinuxServer.io containers that need to run as root
  - Ensures consistent security settings across pod and container levels

## Version 0.0.12

- **Enhanced Capabilities Configuration**: Added support for configurable Linux capabilities
  - Can now add specific capabilities (SETUID, SETGID, CHOWN, DAC_OVERRIDE, etc.)
  - Supports both adding and dropping capabilities
  - Applied to both main container and sidecar containers
- **LinuxServer.io Support**: Full support for containers requiring elevated privileges during initialization

## Version 0.0.11

- **Enhanced Security Context Options**: Added configurable security settings
  - `runAsNonRoot`: Allow or disallow running as root user
  - `allowPrivilegeEscalation`: Control privilege escalation permissions
  - Templates updated to use values-driven configuration instead of hardcoded settings

## Version 0.0.10

- **Read-Only Root Filesystem Control**: Added `readOnlyRootFilesystem` option
  - Configurable read-only root filesystem (default: true)
  - Essential for LinuxServer.io containers that need write access during s6-overlay initialization
  - Templates updated to use dynamic configuration from values.yaml
