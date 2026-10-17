import argon2 from 'argon2';

const h =
  '$argon2id$v=19$m=65536,t=3,p=4$72cy+NL1pVnnCg5tT+nHrg$DFnUUzofQOSKVgqsvmvrJCD8wY2kESX4HvmLcBajJFw';

console.log('verify password:', await argon2.verify(h, 'password'));
console.log('verify wrong:', await argon2.verify(h, 'wrong'));
