import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response } from 'express';
import { UserTable } from '../db/users-table';
import { RefreshTokenTable } from '../db/refresh-token-table';
import { RefreshExpiryTable } from '../db/refresh-expiry-table';
import { SaveRefreshTokenParams, GenerateAccessTokenParams } from '../interfaces';

export const saveRefreshToken = async ({ userId, refreshExpiry, privateKey, authIssuer, authAudience }: SaveRefreshTokenParams) => {
  const user = await UserTable.findByPk(userId);
  if (!user) throw new Error("User not found");

  const token = jwt.sign(
    { id: user.uuid },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: refreshExpiry ? refreshExpiry / 1000 : '1d',
      issuer: authIssuer,
      audience: authAudience,
      subject: user.uuid,
    }
  );

  const hash = await bcrypt.hash(token, 10);
  await RefreshTokenTable.create({
    userUuid: user.uuid,
    token: hash,
    expires: new Date(Date.now() + (refreshExpiry || 24 * 60 * 60 * 1000)),
  });

  return token;
};

export const generateAccessToken = async ({ refreshToken, privateKey, publicKey, authIssuer, authAudience }: GenerateAccessTokenParams) => {
  const userUuid = (jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] }) as { id: string }).id;

  const token = await RefreshTokenTable.findAll({ where: { userUuid } })
    .then((tokens) => tokens.find((t) => bcrypt.compareSync(refreshToken, t.token)));

  if (!token) return null;

  const user = await UserTable.findByPk(token.userUuid);
  if (!user || !user.allowed) return null;

  const newToken = jwt.sign(
    { user: user.dataValues },
    privateKey,
    {
      algorithm: 'RS256',
      expiresIn: '1m',
      issuer: authIssuer,
      audience: authAudience,
      subject: user.uuid,
    }
  );
  return { user: user.dataValues, token: newToken };
};

export const revokeRefreshToken = async (refreshToken: string, publicKey: string) => {
  const decodedToken = jwt.verify(refreshToken, publicKey, { algorithms: ['RS256'] }) as { id: string };
  const userUuid = decodedToken.id;

  const tokens = await RefreshTokenTable.findAll({ where: { userUuid } });
  const token = tokens.find((t) => bcrypt.compareSync(refreshToken, t.token));

  if (token) {
    await RefreshTokenTable.destroy({ where: { uuid: token.uuid } });
  }
};

export const getRefreshExpiry = async (req: Request) => {
  const customerUuid = req.cookies.customerUuid;
  if (!customerUuid) return 24 * 60 * 60 * 1000;

  const expiry = await RefreshExpiryTable.findOne({ where: { customerUuid } });
  return expiry ? expiry.expiryTime : 24 * 60 * 60 * 1000;
};

export const additionalParams = async (req: Request, res: Response) => {
  const customerUuid = req.query.customerUuid;
  if (customerUuid) {
    res.cookie('customerUuid', customerUuid, { maxAge: 5 * 60 * 1000 });
  }
};
