import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureTable } from "../db/feature-table";
import { ScopeTable } from "../db/scope-table";

export class Scope extends Base<Scope> {
  public uuid!: UUID | string;
  public name!: string;
  public parent_uuid?: string;
  public parent?: ScopeTable;
  children?: ScopeTable[];
  userGroups!: UserGroupTable[];
  features!: FeatureTable[];

  constructor(initialValues: Partial<Scope>) {
    super(initialValues);
  }
}