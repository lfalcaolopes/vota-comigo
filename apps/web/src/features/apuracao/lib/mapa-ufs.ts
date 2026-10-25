import type { ExtendedFeature, ExtendedFeatureCollection } from "d3-geo";
import { geoMercator, geoPath } from "d3-geo";

import ufsGeometry from "../data/ufs-ibge.json";

export type UfShape = {
  siglaUf: string;
  d: string;
  labelX: number;
  labelY: number;
  showLabel: boolean;
};

export const MAPA_WIDTH = 600;
export const MAPA_HEIGHT = 620;
// Below this on-screen area (in viewBox units) a sigla would overlap its neighbors.
const MIN_LABEL_AREA = 2000;

type UfFeatureCollection = ExtendedFeatureCollection<
  ExtendedFeature<GeoJSON.Polygon | GeoJSON.MultiPolygon, { siglaUf: string }>
>;

export function buildUfShapes(): UfShape[] {
  const collection = ufsGeometry as unknown as UfFeatureCollection;
  const projection = geoMercator().fitSize(
    [MAPA_WIDTH, MAPA_HEIGHT],
    collection,
  );
  const path = geoPath(projection);

  return collection.features.map((feature) => {
    const [labelX, labelY] = path.centroid(feature);
    return {
      siglaUf: feature.properties.siglaUf,
      d: path(feature) ?? "",
      labelX: Math.round(labelX * 10) / 10,
      labelY: Math.round(labelY * 10) / 10,
      showLabel: path.area(feature) >= MIN_LABEL_AREA,
    };
  });
}
