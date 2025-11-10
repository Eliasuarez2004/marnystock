// src/firebase/productService.js
import { db, storage } from './config';
import { collection, addDoc, getDocs, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { nanoid } from 'nanoid';

const PRODUCTS_COLLECTION = 'products';

// Función para subir una imagen y obtener la URL
const uploadImage = async (imageFile) => {
  const uniqueId = nanoid();
  const imageRef = ref(storage, `products/${uniqueId}-${imageFile.name}`);
  await uploadBytes(imageRef, imageFile);
  const imageUrl = await getDownloadURL(imageRef);
  return imageUrl;
};

// CREATE
export const addProduct = async (productData, imageFile) => {
  let imageUrl = '';
  if (imageFile) {
    imageUrl = await uploadImage(imageFile);
  }
  await addDoc(collection(db, PRODUCTS_COLLECTION), { ...productData, imageUrl });
};

// READ (en tiempo real)
export const getProducts = (callback) => {
  const productsCollection = collection(db, PRODUCTS_COLLECTION);
  return onSnapshot(productsCollection, (snapshot) => {
    const products = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(products);
  });
};

// UPDATE
export const updateProduct = async (productId, productData, imageFile) => {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    let updatedData = { ...productData };

    if (imageFile) {
        const newImageUrl = await uploadImage(imageFile);
        updatedData.imageUrl = newImageUrl;
        // Opcional: podrías querer borrar la imagen antigua de Storage aquí
    }
    await updateDoc(productRef, updatedData);
};

// DELETE
export const deleteProduct = async (productId, imageUrl) => {
  // Borrar documento de Firestore
  await deleteDoc(doc(db, PRODUCTS_COLLECTION, productId));
  
  // Borrar imagen de Storage (si existe)
  if (imageUrl) {
    const imageRef = ref(storage, imageUrl);
    try {
        await deleteObject(imageRef);
    } catch (error) {
        console.error("Error al borrar la imagen. Puede que ya no exista.", error);
    }
  }
};