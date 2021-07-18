# AuthProject
 This is a basic authentication and CRUD API.

To begin with, a user must signup at /signup using the following details : name, email, password and role. All are strings.
The user is assigned the role that is sent, provided it exists in the database. If it doesn't, user is requested to create the role by sending a post request at /role

In order to create a role, one must send the following: name, scopes[].
Each role has a list of scopes that determine whether a user has access to the resources or not. They are as follows:
1) user-get
2) role-get
3) student-get
4) student-create
5) school-create
6) school-get
They must be mentioned in string form in the scopes array.
Role "Admin" has all scopes.

Once the user signs up, they must sign in at /signin using email and password (both strings). A cookie is created using json web token.

The following routes are available. If user does not have access to any of these routes, they will be notified.
1) /signup [POST]
2) /signin [POST]
3) /user [GET]
4) /user/:id [GET]
5) /role [POST]
6) /role [GET]
7) /student [POST]
8) /student [GET]
9) /school [POST]
10) /school [GET]

The user can do a number of functions:
1) get all users using /user
2) get a single user using /user/:id where id is the object id of the single user targetted
3) create a student using /student under their own account
4) get all students in their account using /student
5) create a school using /school
6) get all schools using /school

