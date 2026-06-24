import coDriversJson from "@/content/coDrivers.json";
import { type CoDriver, coDriversFileSchema } from "@/schemas/coDriver";

const coDrivers: CoDriver[] = coDriversFileSchema.parse(coDriversJson);
const coDriverById = new Map(coDrivers.map((coDriver) => [coDriver.id, coDriver]));

if (coDriverById.size !== coDrivers.length) {
  throw new Error("coDrivers.json contains duplicate co-driver ids");
}

export function allCoDrivers(): readonly CoDriver[] {
  return coDrivers;
}

export function getCoDriver(id: string): CoDriver | undefined {
  return coDriverById.get(id);
}
