// src/lib/currentUser.ts

// Por enquanto vamos usar um ID fixo para a "conta principal".
// Assim você e a Marieli, usando o mesmo app, enxergam os mesmos dados.
const FIXED_USER_ID = "sirius-main-user";

export function getCurrentUserId(): string {
  return FIXED_USER_ID;
}
