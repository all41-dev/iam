import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";
import { PermissionTable } from "../db/permission-table";
import { UserTable } from "../db/users-table";

export class UserGroup extends Base<UserGroup> {
  public uuid!: UUID | string;
  public name!: string;
  public scopeUuid!: string;
  public scopeElementUuid?: string;
  public permissions!: PermissionTable[];
  public users!: UserTable[];

  constructor(initialValues: Partial<UserGroup>) {
    super(initialValues);
  }
}