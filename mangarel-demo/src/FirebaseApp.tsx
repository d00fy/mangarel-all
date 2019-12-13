import React, { FC } from 'react';
import firebase from '../functions/node_modules/firebase/app';
import '../functions/node_modules/firebase/auth';
import '../functions/node_modules/firebase/firestore';

import { FirebaseContext } from './contexts';

const FirebaseApp: FC = ({ children }) => {
  const db = firebase.firestore();

  return (
    <FirebaseContext.Provider value={{ db }}>
      {children}
    </FirebaseContext.Provider>
  );
};

export default FirebaseApp;
