import { AuthUserTable } from "../db/auth-user-table";
import { checkUserPermissions } from "./check-permissions";
export async function checkUser(
  profile: any,
  provider: string
): Promise<{ user: any; error?: string }> {
  const email = profile.emails[0].value;
  const displayName = profile.displayName;
  let firstName = profile.name?.givenName || displayName.split(' ')[0];
  let lastName = profile.name?.familyName || displayName.split(' ')[1];
  if (!firstName) firstName = displayName;
  if (!lastName) lastName = '';

  return await AuthUserTable.findOne({ where: { email } }).then(async (user) => {
    if (!user) {
      await AuthUserTable.create({
        email,
        username: displayName,
        firstName,
        lastName,
        provider,
      });
      return { user: false, error: 'denied' };
    } else if (provider !== user.provider) {
      return { user: false, error: 'provider' };
    } else {
      const permissions = await checkUserPermissions(user.uuid);
      return {
        user: {
          ...user.dataValues,
          permissions: permissions.featurePermissions,
        },
      };
    }
  });
}