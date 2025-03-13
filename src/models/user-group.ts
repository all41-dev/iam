import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";
import { PermissionTable } from "../db/permission-table";
import { AuthUserTable } from "../db/auth-user-table";

export class UserGroup extends Base<UserGroup> {
  public uuid!: UUID | string;
  public name!: string;
  public scope_uuid!: string;
  public scopeElement_uuid?: string;
  public permissions!: PermissionTable[];
  public users!: AuthUserTable[];

  constructor(initialValues: Partial<UserGroup>) {
    super(initialValues);
  }
}