import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";
import { UserGroupTable } from "../db/user-group-table";
import { FeatureTable } from "../db/feature-table";

export class Permission extends Base<Permission> {
  public uuid!: UUID | string;
  public isDeny!: boolean;
  public featureScopeUuid?: string;
  public groupUuid!: string;
  public featureUuid!: string;
  public group!: UserGroupTable;
  public feature!: FeatureTable;

  constructor(initialValues: Partial<Permission>) {
    super(initialValues);
  }
}