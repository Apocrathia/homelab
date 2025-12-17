# Kong Gateway Operator

Kong Gateway Operator manages Kong Gateway deployments on Kubernetes using the Gateway API.

## Components

- **Kong Operator**: Manages `ControlPlane`, `DataPlane`, `GatewayConfiguration`, and other Kong CRDs
- **Kong Ingress Controller (KIC)**: Translates Kubernetes resources into Kong configuration
- **Kong Gateway**: The actual data plane that handles traffic

## Usage

Create a `GatewayClass` referencing a `GatewayConfiguration`, then create `Gateway` resources:

```yaml
apiVersion: gateway-operator.konghq.com/v1beta1
kind: GatewayConfiguration
metadata:
  name: kong
  namespace: kong-system
spec:
  dataPlaneOptions:
    deployment:
      podTemplateSpec:
        spec:
          containers:
            - name: proxy
              image: kong:3.9
  controlPlaneOptions:
    deployment:
      podTemplateSpec:
        spec:
          containers:
            - name: controller
              image: kong/kubernetes-ingress-controller:3.5.0
---
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: kong
spec:
  controllerName: konghq.com/gateway-operator
  parametersRef:
    group: gateway-operator.konghq.com
    kind: GatewayConfiguration
    name: kong
    namespace: kong-system
```

## References

- [Kong Operator Documentation](https://developer.konghq.com/operator/)
- [Kong Operator GitHub](https://github.com/Kong/kong-operator)
