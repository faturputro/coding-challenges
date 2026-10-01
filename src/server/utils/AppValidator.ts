import { validate, version } from 'uuid';
import AppValidator from 'validatorjs';

AppValidator.register('isUUIDV7', (val) => {
  if (val === undefined || val === null) return false;
  return !!(String(val)?.length && validate(val) && version(String(val)) === 7);
}, ':attribute invalid ID format');

export default AppValidator;
