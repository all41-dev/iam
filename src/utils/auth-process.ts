import { checkUser } from "./check-user";

export async function handleUserProfile(profile: any, provider: string) {
  const email = profile.emails[0].value;
  const displayName = profile.displayName;
  let firstName = profile.name?.givenName || profile.displayName.split(' ')[0];
  let lastName = profile.name?.familyName || profile.displayName.split(' ')[1];
  if (!firstName) firstName = profile.displayName;
  if (!lastName) lastName = '';

  try {
    const { user, error } = await checkUser(email, displayName, firstName, lastName, provider);
    return { user, error };
  } catch (e) {
    throw e;
  }
}