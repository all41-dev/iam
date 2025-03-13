import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";
import { PermissionTable } from "../db/permission-table";
import { ScopeTable } from "../db/scope-table";
import { FeatureTable } from "../db/feature-table";

export class Feature extends Base<Feature> {
  public uuid!: UUID | string;
  public name!: string;
  public scope_uuid!: string;
  public permissions?: PermissionTable[];
  public scope?: ScopeTable;
  public children?: FeatureTable[];
  public parents?: FeatureTable[];


  constructor(initialValues: Partial<Feature>) {
    super(initialValues);
  }
}