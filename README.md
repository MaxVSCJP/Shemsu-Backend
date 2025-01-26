This is a practise project made s a final project for GDSC 2024 Backend Course.
This is just the backend of the project, the frontend will be made another time.

If you want to clone this project, make sure to install the neccessary modules that can be seen in the package.json file's dependencies attribute.
You also need to add an .env file to the root of the project and add a "JWT_SECRET" variable in it for the code to function as well as a "MONGODB_URI" variable along with your own Mongodb Atlas Cluster.
P.S dont forget to add a PORT variable to the .env file (you can also leave it blank and the server would run on port 1738)


Anbibu is a platform which allows books vendors and libraries to manage their libraries online. In doing so it also allows potential readers or buyers to see all the available books on the platform giving book vendors a place to market their libraries.

Anbibu's architecture is fairly simple.

The MongoDB database consists of 2 collections: 
- Users &
- Books

There are 2 main actors in this platform. Both are users of the platform, but one is libraries & book vendors (whose data is saved by the platform) while the other is readers, which are on the platform to scour through the catalogs of books to find one to read(at a library) or buy(from a vendor). Henceforth, the former type of User shall be refered to as User, while the latter shall be refered to as Readers.

A User is either a book vendor or a library and they can use the platform to manage their library while also marketing it to the masses online.
A User can perform simple CRUD operations on Books (add books, search for books, update books, delete books).

Readers can use the platform to find books that they like contact the vendor if they want to buy it or go to one of the libraries that houses the book they were interested in.



Available API Endpoints:

- https://gdsc-anbibu-project-backend.onrender.com/auth/signup
  POST request
  Body Requires:
  - name
  - username
  - email
  - password
  - location (optional)
  - phone (optional)

    
- https://gdsc-anbibu-project-backend.onrender.com/auth/login
  POST request
  Body Requires:
  - username
  - password
  Returns JWT Token for authentication purposes to be used on every     request sent while logged in. 

 
- https://gdsc-anbibu-project-backend.onrender.com/user/EditUser
  PATCH request
  Body Optional Requirements:
  - name
  - username
  - email
  - location
  - phone
 Authorization Header Requirements:
  - JWT Token created on login

  
- https://gdsc-anbibu-project-backend.onrender.com/user/DeleteUser
  DELETE request
  Deletes a user along with any books they might have added
  No Body Requirements
  Authorization Header Requirements:
  - JWT Token created on login

 
- https://gdsc-anbibu-project-backend.onrender.com/search/:name
  GET request
  Used to search for books for Readers
  Searches for books with Title or Author similar to :name

API endpoints after this all require
JWT Token created on login in Authorization part of Header:


- https://gdsc-anbibu-project-backend.onrender.com/books/AddBook
  POST request
  Body Requirements:
  - Title
  - Author
  - PublishYear
  - Genre (optional)
  - NumberOfCopies (optional)
  - Description (optional)
  - Price (optional)

 
- https://gdsc-anbibu-project-backend.onrender.com/books/EditBook/:id
  PATCH request
  :id = bookId (automatically created, json data including the id is     returned when book is added)
  Body Optional Requirements:
  - Title
  - Author
  - PublishYear
  - Genre 
  - NumberOfCopies 
  - Description
  - Price


- https://gdsc-anbibu-project-backend.onrender.com/books/SearchBook/:name
- GET request
  Used to search for books for Users
  Searches for books with Title or Author similar to :name which is     owned by the logged in user (which is known through the JWT Token     in the request)


- https://gdsc-anbibu-project-backend.onrender.com/books/DeleteBook
  DELETE request
  Deletes a Book
  Body Requirement:
  - bookId

