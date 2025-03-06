import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";

export class Permission extends Base<Permission> {
  public uuid!: UUID;
  public is_deny!: string;
  public feature_scope_uuid?: string;
  public user_group_uuid!: string;
  public feature_uuid!: string;
}