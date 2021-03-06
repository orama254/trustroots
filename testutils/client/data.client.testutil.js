import faker from 'faker';
import range from 'lodash/range';

import {
  generateClientUser,
  generateMongoId,
} from '../common/data.common.testutil';

export { generateClientUser };

export function generateThreads(count, { userFrom, userTo } = {}) {
  return range(count).map(() => generateThread({ userFrom, userTo }));
}

function generateThread({
  userFrom = generateClientUser(),
  userTo = generateClientUser(),
} = {}) {
  return {
    _id: generateMongoId(),
    read: true,
    updated: new Date().toISOString(),
    message: {
      excerpt: faker.lorem.sentence(),
    },
    userFrom,
    userTo,
  };
}
