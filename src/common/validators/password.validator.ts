import { registerDecorator, ValidationOptions } from 'class-validator';

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return false;

          // At least 8 characters
          if (value.length < 8) return false;

          // At least one uppercase letter
          if (!/[A-Z]/.test(value)) return false;

          // At least one lowercase letter
          if (!/[a-z]/.test(value)) return false;

          // At least one number
          if (!/[0-9]/.test(value)) return false;

          // At least one special character
          if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(value)) return false;

          return true;
        },
        defaultMessage() {
          return 'Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character';
        },
      },
    });
  };
}
