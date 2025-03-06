import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";

export class UserGroup extends Base<UserGroup> {
  public uuid!: UUID;
  public name!: string;
  public scope_uuid!: string;
  public scope_element_uuid?: string;
}