import { Request, Response, NextFunction } from 'express';

/**
 * Validates that the provided ID parameter is a valid integer.
 */
export const validateId = (paramName: string = 'id') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = req.params[paramName];
    if (!id || isNaN(Number(id)) || !Number.isInteger(Number(id))) {
      return res.status(400).json({ error: `Invalid ${paramName} parameter. Must be an integer.` });
    }
    next();
  };
};

/**
 * Validates that date strings match the YYYY-MM-DD format.
 */
export const validateDate = (paramNames: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    for (const param of paramNames) {
      const dateStr = req.query[param] as string;
      if (dateStr && !dateRegex.test(dateStr)) {
        return res.status(400).json({ error: `Invalid format for ${param}. Use YYYY-MM-DD.` });
      }
    }
    next();
  };
};

/**
 * Validates that enum values are within the allowed set.
 */
export const validateEnum = (paramName: string, allowedValues: string[], source: 'query' | 'body' = 'query') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const value = source === 'query' ? req.query[paramName] : req.body[paramName];
    if (value && !allowedValues.includes(value as string)) {
      return res.status(400).json({ error: `Invalid ${paramName}. Allowed values: ${allowedValues.join(', ')}` });
    }
    next();
  };
};
