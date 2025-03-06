import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";

export class Scope extends Base<Scope> {
  public uuid!: UUID;
  public name!: string;
  public parent_uuid?: string;
}