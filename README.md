# CORE Capstone Project

For easily deploying static websites with their own serverless compute hosted on Lambdas

**Developed by:**
Christian Larwood
Owen Lenz
Rodney Matambo
Ezra Ellette

Todo: Ezra and Rodney

<!-- - s3 versioning of objects = Ezra -->
<!-- - s3 Delete command that only deletes the new version of an object(?maybe walks through the local directory) -->
<!-- - Cloudfront distro: waitForDistUpdate and waitForDistInval = Rodney -->
<!-- - Dynamo creating table = Ezra done -->
- update.js - updating an existing distro
  - updating lambdas
  <!-- - updating static assets -->
  - updating the distribution
  - new entry in dynamo table

  - Update API integrations for new version of lambda
  - Teardown if we have one version in a lambda completely delete, otherwise delete the version.
~~~

Talk about:
- build server hosting place
- github integration
