// src/firebase/clientService.js
import { db } from './config';
import { collection, addDoc, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const CLIENTS_COLLECTION = 'clients';

// CREATE
export const addClient = async (clientData) => {
  await addDoc(collection(db, CLIENTS_COLLECTION), clientData);
};

// READ (en tiempo real)
export const getClients = (callback) => {
  const clientsCollection = collection(db, CLIENTS_COLLECTION);
  return onSnapshot(clientsCollection, (snapshot) => {
    const clients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(clients);
  });
};

// UPDATE
export const updateClient = async (clientId, clientData) => {
  const clientRef = doc(db, CLIENTS_COLLECTION, clientId);
  await updateDoc(clientRef, clientData);
};

// DELETE
export const deleteClient = async (clientId) => {
  await deleteDoc(doc(db, CLIENTS_COLLECTION, clientId));
};