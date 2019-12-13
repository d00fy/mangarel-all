import firebase from '../../../functions/node_modules/firebase/app';
import { isEmpty } from 'lodash';

import { User, blankUser } from './models/user';
import { collectionName } from './constants';

const writeUser = async (
  db: firebase.firestore.Firestore,
  firebaseUser: firebase.User,
  credential: firebase.auth.UserCredential,
) => {
  const id = firebaseUser.uid;
  const { displayName } = firebaseUser;
  const photoUrl = firebaseUser.photoURL;
  let providerUid = '';
  let screenName = '';
  let description = '';

  if (credential.additionalUserInfo) {
    if (credential.additionalUserInfo.username) {
      screenName = credential.additionalUserInfo.username;
    }
    if (credential.additionalUserInfo.profile) {
      /* eslint-disable @typescript-eslint/no-explicit-any */
      providerUid = (credential.additionalUserInfo.profile as any).id_str;
      description =
        (credential.additionalUserInfo.profile as any).description || '';
      /* eslint-enable */
    }
  }

  if (!providerUid || !screenName) {
    throw new Error('Invalid credential information.');
  }

  // resolve screenname duplication
  const query = await db
    .collection(collectionName.users)
    .where('screenName', '==', screenName)
    .get();
  if (query.size) {
    const rnd = Math.floor(Math.random() * 10000);
    screenName = `${screenName}${rnd}`;
  }

  const userDoc = await db
    .collection(collectionName.users)
    .doc(id)
    .get();
  const batch = db.batch();
  providerUid = `t${providerUid}`;

  if (userDoc.exists) {
    const user = userDoc.data() as User;
    const diff: Partial<User> = {};
    if (user.description !== description) {
      diff.description = description;
    }
    if (user.displayName !== displayName) {
      diff.displayName = displayName;
    }
    if (user.photoUrl !== photoUrl) {
      diff.photoUrl = photoUrl;
    }
    if (!isEmpty(diff)) {
      batch.update(userDoc.ref, {
        ...diff,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
    }
  } else {
    const user: User = {
      ...blankUser,
      providerUid,
      screenName,
      displayName,
      description,
      photoUrl,
    };
    batch.set(userDoc.ref, {
      ...user,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    const counterDoc = db
      .collection(collectionName.docCounters)
      .doc(collectionName.users);
    batch.set(
      counterDoc,
      {
        count: firebase.firestore.FieldValue.increment(1),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  await batch.commit();
};

export default writeUser;
