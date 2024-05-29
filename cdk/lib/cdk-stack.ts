import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as route53Targets from "aws-cdk-lib/aws-route53-targets";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as iam from "aws-cdk-lib/aws-iam";
import * as fs from "fs";
import * as path from "path";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as triggers from 'aws-cdk-lib/triggers';

interface CustomStackProps extends cdk.StackProps {
  stage: string;
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CustomStackProps) {
    super(scope, id, {
      ...props,
    });

    const stage = props.stage;

    // Frontend Setup
    // Route53 Records for Site Hosting
    let hostedZone: route53.IHostedZone;
    const domainName = "grantstarkman.com";
    hostedZone = route53.HostedZone.fromLookup(this, `HostedZone`, {
      domainName: domainName,
    });

    // S3 Bucket for Website Hosting
    const trendBitWebsiteBucketName = `trendbit.grantstarkman.com`;
    const trendBitWebsiteBucket = new s3.Bucket(
      this,
      trendBitWebsiteBucketName,
      {
        bucketName: trendBitWebsiteBucketName,
        websiteIndexDocument: "index.html",
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        versioned: true,
        blockPublicAccess: {
          blockPublicAcls: false,
          blockPublicPolicy: false,
          ignorePublicAcls: false,
          restrictPublicBuckets: false,
        },
        publicReadAccess: true,
      },
    );

    // S3 Deployment - Drop environment.json file into S3 bucket
    const jsonData = {
      environment: stage,
      apiUrl: "https://api.grantstarkman.com/question",
    };

    const dedicatedDir = path.join(__dirname, "tempAssets");
    if (!fs.existsSync(dedicatedDir)) {
      fs.mkdirSync(dedicatedDir);
    }
    const jsonFilePath = path.join(dedicatedDir, "environment.json");
    fs.writeFileSync(jsonFilePath, JSON.stringify(jsonData, null, 2));

    new s3deploy.BucketDeployment(this, `DeployTrendBit`, {
      sources: [
        s3deploy.Source.asset("../TrendBitFrontend/build"),
        s3deploy.Source.asset(dedicatedDir),
      ],
      destinationBucket: trendBitWebsiteBucket,
    });

    // Cloudfront OAI for S3 Bucket
    const trendBitCloudfrontOAI = new cloudfront.OriginAccessIdentity(
      this,
      `${stage}-TrendBitCloudfrontOAI`,
      {
        comment: `OAI for ${trendBitWebsiteBucket.bucketName} bucket.`,
      },
    );
    trendBitWebsiteBucket.grantRead(trendBitCloudfrontOAI);

    // Add permissions for CloudFront OAI to access the S3 bucket
    trendBitWebsiteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [trendBitWebsiteBucket.arnForObjects("*")],
        principals: [
          new iam.CanonicalUserPrincipal(
            trendBitCloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
          ),
        ],
      }),
    );

    // ACM Certificate for Cloudfront Frontend
    //const trendBitDomainName = `${stage}.trendbit.grantstarkman.com`;
    const trendBitDomainName = "trendbit.grantstarkman.com";
    const trendBitCloudfrontSiteCertificate = new acm.Certificate(
      this,
      `${stage}-TrendBitCloudfrontSiteCertificate`,
      {
        domainName: trendBitDomainName,
        certificateName: `${stage}-TrendBitCloudfrontSiteCertificate`,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      },
    );

    // Viewer Certificate for Cloudfront Distribution Frontend
    const trendBitViewerCertificate =
      cloudfront.ViewerCertificate.fromAcmCertificate(
        trendBitCloudfrontSiteCertificate,
        {
          aliases: [trendBitDomainName],
        },
      );

    // Cloudfront Distribution for Frontend
    const trendBitDistribution = new cloudfront.Distribution(
      this,
      "TrendBitDistribution",
      {
        comment: `CloudFront distribution for ${trendBitWebsiteBucket.bucketName} bucket.`,
        defaultBehavior: {
          responseHeadersPolicy: new cloudfront.ResponseHeadersPolicy(
            this,
            "ResponseHeadersPolicy",
            {
              customHeadersBehavior: {
                customHeaders: [
                  {
                    header: "cache-control",
                    value: "no-store",
                    override: true,
                  },
                ],
              },
            },
          ),
          origin: new origins.S3Origin(trendBitWebsiteBucket, {
            originAccessIdentity: trendBitCloudfrontOAI,
          }),

          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
        defaultRootObject: "index.html",
        domainNames: ["trendbit.grantstarkman.com"],
        certificate: trendBitCloudfrontSiteCertificate,
      },
    );

    // Route 53 Records for Cloudfront Distribution Frontend
    //const trendBitRecordName = `${stage}.trendbit.grantstarkman.com`;
    const trendBitRecordName = "trendbit.grantstarkman.com";
    new route53.ARecord(this, `TrendBitCloudFrontARecord`, {
      zone: hostedZone,
      recordName: trendBitRecordName,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.CloudFrontTarget(trendBitDistribution),
      ),
    });

    // Backend Setup
    // ECR Lambda
    const repository = ecr.Repository.fromRepositoryArn(
      this,
      "LambdaRepository",
      "arn:aws:ecr:us-east-1:659946347679:repository/trendbit",
    );

    // Lambda Lambda Function
    const trendbitLambdaFunction = new lambda.Function(this, `LambdaFunction`, {
      functionName: `trend-bit-lambda-function`,
      code: lambda.Code.fromEcrImage(repository, {
        tag: "latest",
      }),
      handler: lambda.Handler.FROM_IMAGE,
      runtime: lambda.Runtime.FROM_IMAGE,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        GEMINI_API_KEY: "",
      },
      tracing: lambda.Tracing.ACTIVE,
    });

    const apiDomainName = `api.trendbit.grantstarkman.com`;
    const trendBitApiGatewaySiteCertificate = new acm.Certificate(
      this,
      `TrendBitApiGatewaySiteCertificate`,
      {
        domainName: apiDomainName,
        certificateName: `${stage}-TrendBitCloudfrontSiteCertificate`,
        validation: acm.CertificateValidation.fromDns(hostedZone),
      },
    );

    // Lambda Rest API
    const api = new apigateway.LambdaRestApi(this, `api.trendbit.grantstarkman.com`, {
      handler: trendbitLambdaFunction,
      apiKeySourceType: apigateway.ApiKeySourceType.HEADER,
      domainName: {
        domainName: apiDomainName,
        certificate: trendBitApiGatewaySiteCertificate,
      },
      proxy: false,
    });

    const updateTrendingCoins = api.root.addResource("update-trending-coins");
    updateTrendingCoins.addMethod(
      "POST",
      new apigateway.LambdaIntegration(trendbitLambdaFunction),
    );
    updateTrendingCoins.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["POST"],
    });

    const getTrendingCoins = api.root.addResource("get-trending-coins");
    getTrendingCoins.addMethod(
      "GET",
      new apigateway.LambdaIntegration(trendbitLambdaFunction),
    );
    getTrendingCoins.addCorsPreflight({
      allowOrigins: ["*"],
      allowMethods: ["GET"],
    });

    // Route 53 Records
    new route53.ARecord(this, `ApiGateway-ARecord`, {
      zone: hostedZone,
      recordName: apiDomainName,
      target: route53.RecordTarget.fromAlias(
        new route53Targets.ApiGateway(api),
      ),
      deleteExisting: true,
    });

    // Create a new DynamoDB Table
    const table = new dynamodb.Table(this, 'TrendingCoinsTableV2', {
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      tableName: 'TrendingCoinsTableV2',
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    table.grantFullAccess(trendbitLambdaFunction);

    const rule = new events.Rule(this, 'Rule', {
      schedule: events.Schedule.expression('rate(1 hour)')

    });

    rule.addTarget(
      new targets.ApiGateway(api, {
        path: '/udpate-trending-coins',
        method: 'POST',
        stage: 'prod',
      }),
    )

    rule.addTarget(
      new targets.LambdaFunction(trendbitLambdaFunction)
    )
  }
}
