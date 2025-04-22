# **iam.api**

**API for Identity and Access Management**

This library provides an easy way to integrate identity and access management functionality into your project. Follow the steps below to get started.

---

## **Installation**

To install the library as a dependency in your project, run the following command:  
```bash
npm install @all41-dev/iam.api
```

---

## **Usage**

### **Database Configuration**
The tool automatically sets up a basic database, including a `user` table with essential fields (e.g., `email`). Depending on your needs, you can customize the database in the following ways:

1. **Extend the Default Model:**  
   - Add your custom fields to the `user` model.  
   - Update the `@Table` decorator if you wish to change the `tableName`.

2. **Replace the User Table:**  
   - Run the SQL script located in `sql_scripts/user_remove` to remove the default `user` table.  
   - Create your custom `user` table with the necessary fields.  
   - Recreate the index for the `user_group_member` table to maintain relationships.

---

### **Local vs. Integrated Use**

- **Standalone Configuration:**  
   Run the project locally to configure user rights and permissions without embedding it directly into your application.  

- **Integrated Configuration:**  
   To integrate configuration directly into your application, refer to the [https://github.com/all41-dev/iam.front.git repository](#) for detailed instructions on incorporating it seamlessly into your project.