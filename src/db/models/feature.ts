import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";

export class Feature extends Base<Feature> {
  public uuid!: UUID;
  public name!: string;
  public scope_uuid!: string;
}