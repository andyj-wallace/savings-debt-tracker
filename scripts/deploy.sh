#!/bin/bash                                                                                                                              
  npm run build                                                                                                                            
  aws s3 sync build/ s3://debt-tracker-frontend-345482189946 --delete                                                                                        
  aws cloudfront create-invalidation --distribution-id E32QY8QSJEP5XT --paths "/*"      