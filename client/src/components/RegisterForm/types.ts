import type React from 'react';

/** All text fields managed by the registration form. */
export type FieldName =
  | 'displayName'
  | 'email'
  | 'password'
  | 'businessName'
  | 'instagramHandle'
  | 'phoneNumber'
  | 'bankAccountLast4'
  | 'stateName'
  | 'cityName'
  | 'category'
  | 'description'
  | 'whatsappUrl'
  | 'tiktokUrl';

export type FieldValues = Record<FieldName, string>;

export const EMPTY_FIELDS: FieldValues = {
  displayName: '',
  email: '',
  password: '',
  businessName: '',
  instagramHandle: '',
  phoneNumber: '',
  bankAccountLast4: '',
  stateName: '',
  cityName: '',
  category: '',
  description: '',
  whatsappUrl: '',
  tiktokUrl: '',
};

export type FieldChangeHandler = (
  name: FieldName,
) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;

/** Everything a step-field component needs to render and validate its inputs. */
export interface WizardFormApi {
  fields: FieldValues;
  touched: Record<string, boolean>;
  fieldErrors: Record<string, string>;
  handleFieldChange: FieldChangeHandler;
  handleBlur: (name: string) => () => void;
  labelStyle: React.CSSProperties;
  inputGroupStyle: React.CSSProperties;
  errorStyle: React.CSSProperties;
}
