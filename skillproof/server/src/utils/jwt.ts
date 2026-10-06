import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
  return process.env.JWT_SECRET || 'skillproof_super_secret_jwt_key_2026_prod_quality';
};

const JWT_EXPIRES_IN = '7d';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  username?: string;
}

export const signToken = (payload: JwtPayload): string => {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
};


