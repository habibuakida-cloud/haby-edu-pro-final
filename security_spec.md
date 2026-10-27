# Security Specification - Class Monitor System

## Data Invariants
1. A Teacher's PIN must be exactly 4 digits (hashed length approx 60).
2. A ClassJournal entry cannot exist without a valid teacherId and monitorId.
3. ClassJournal timeIn and timeOut must be valid ISO strings.
4. Only Admins can modify Teacher biometric data (pinCode, fingerprintTemplate).
5. Monitors can only create ClassJournal entries for their own school.

## The "Dirty Dozen" Payloads (Deny List)
1. Creating a ClassJournal entry with a future timeIn.
2. Updating a ClassJournal entry to change the teacherId after creation.
3. Monitor trying to update a Teacher's fingerprintTemplate.
4. Setting a Teacher's pinCode to an unhashed plain text string.
5. Creating a ClassJournal without a schoolId.
6. A non-admin user reading a Teacher's hashed pinCode.
7. Injecting a 1MB string into the deviceId field.
8. Deleting a ClassJournal entry (monitors should only create/update timeOut).
9. Updating a ClassJournal entry's verificationMethod to a non-enum value.
10. Creating a ClassJournal entry with a timeOut that is before timeIn.
11. Monitor trying to set isVerified: true on their own journal entry if such a field existed.
12. Accessing /class_journals without being authenticated.

## Rules Logic
- `isValidTeacher(data)`: checks name, schoolId, and biometric field formats.
- `isValidJournal(data)`: checks required fields, enum verificationMethod, and length of deviceId.
