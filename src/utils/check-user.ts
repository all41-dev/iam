import { UserTable } from "../db/users-table";
import { checkUserPermissions } from "./check-permissions";

export async function checkUser(
  email: string,
  displayName: string,
  firstName: string,
  lastName: string,
  provider: string
): Promise<{ user: any; error?: string }> {
  const user = await UserTable.findOne({ where: { email: email } });

  if (!user) {
    await UserTable.create({
      email: email,
      username: displayName,
      firstName: firstName,
      lastName: lastName,
      provider: provider,
    });
    return { user: false, error: "denied" };
  } else if (provider !== user.provider) {
    return { user: false, error: "provider" };
  } else if (!user.allowed) {
    return { user: false, error: 'denied' };
  } else {
    const permissions = await checkUserPermissions(user.uuid);
    return {
      user: {
        ...user.dataValues,
        permissions: permissions.featurePermissions,
      },
    };
  }
} 
