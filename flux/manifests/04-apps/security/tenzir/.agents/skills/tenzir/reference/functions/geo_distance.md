---
title: "geo_distance"
canonical: https://tenzir.com/docs/reference/functions/geo_distance
source: https://tenzir.com/docs/reference/functions/geo_distance.md
section: "Docs"
---

# geo_distance

> Computes the surface distance between two geographic coordinates.

Computes the surface distance between two geographic coordinates.

```tql
geo_distance(lon1:number, lat1:number, lon2:number, lat2:number,
             [spheroid=bool]) -> float
```

## Description

The `geo_distance` function computes the shortest surface distance between two locations on Earth. It interprets the coordinates as WGS-84 longitude and latitude values in degrees and returns the distance in meters.

By default, the function uses the Haversine formula with a mean Earth radius of 6,371,008.8 meters. Set `spheroid=true` to account for the shape of the WGS-84 reference ellipsoid. The spheroidal calculation is more accurate but more expensive.

The function returns `null` if a coordinate is `null`, non-finite, or outside its valid range. Longitudes must be between -180 and 180 degrees. Latitudes must be between -90 and 90 degrees.

### `lon1: number`

The longitude of the first location in degrees.

### `lat1: number`

The latitude of the first location in degrees.

### `lon2: number`

The longitude of the second location in degrees.

### `lat2: number`

The latitude of the second location in degrees.

### `spheroid = bool (optional)`

Whether to calculate the distance on the WGS-84 reference ellipsoid.

Defaults to `false`.

## Examples

### Calculate the distance between two cities

Calculate the spherical distance from Berlin to London:

```tql
from {
  distance_m: int(geo_distance(13.405, 52.52, -0.1276, 51.5072)),
}
```

```tql
{distance_m: 931561}
```

### Use the WGS-84 spheroid

Enable the spheroidal calculation when you need greater accuracy:

```tql
from {
  distance_m: int(
    geo_distance(13.405, 52.52, -0.1276, 51.5072, spheroid=true),
  ),
}
```

```tql
{distance_m: 934514}
```

### Filter by distance

Keep events within 50 kilometers of Berlin:

```tql
where geo_distance(longitude, latitude, 13.405, 52.52) <= 50_000
```
