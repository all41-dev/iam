import { Base } from "@harps-ch/spider.models";
import UUID from "pure-uuid";
import { UserGroup } from "./user-group";

export class User extends Base<User> {
  public uuid!: UUID;
  public username!: string;
  public email!: string;
  public firstName?: string;
  public lastName?: string;
  public provider!: string;

  public groups?: UserGroup[];
}
