INSERT INTO NCI.APP_MAIL_TEMPLATE_T (ID, APP_NAME, SHORT_IDENTIFIER, DESCRIPTION, SUBJECT, BODY, ACTIVE_FLAG, CREATE_DATE, CREATE_USER_ID, LAST_CHANGE_DATE, LAST_CHANGE_USER_ID)
VALUES (81, 'I2ECWS', 'FS_4R00_MISSING', 'Send notification to OGA BOB Team 1 when PayType4 K99-R00 request submitted but no matching 4R00 grant is found', 'Subject - embedded in body',
'<!DOCTYPE html>
 <html lang="en" xmlns:th="http://www.thymeleaf.org">
 <head>
   <meta charset="UTF-8">
   <title>Title</title>
 </head>

 <th:block th:fragment="subject">
   [FS] Missing <span th:text="${missing4R00}" th:remove="tag">4R00CA12345-03</span> Grant Application
 </th:block>

 <body th:fragment="body" style="font-family:arial; font-size: 15px;">

 <div style="background: #1e3f6c;">
   <p>
     <span style="font-size: 20px; color: white;">&nbsp&nbsp<b>Funding Selections</b></span><br/>
     <span style="font-size: 18px; color: white;">&nbsp&nbspNCI''s IMPAC II Extension (I2E) System</span><br/>
     <span style="font-size: 13px; color: white;">&nbsp&nbsp&nbspNational Institutes of Health</span>
   </p>
 </div>

 <p>
   This is to let you know that the following Pay Type 4 request (ID: <a th:href="${viewurl +  request.frqId}" href="#" th:text="${request.frqId}">123456</a>)
   has been submitted by the program director <a href="#" th:href="@{''mailto:'' + ${request.requestorPdEmailAddr}}"><span th:text="${request.requestorPdFullName}" th:remove="tag"></span></a> and the corresponding <span th:text="${missing4R00}" th:remove="tag">4R00CA12345-03</span> does not exist in I2E.
 </p>

 <p>
   Please create the <span th:text="${missing4R00}" th:remove="tag">4R00CA12345-03</span> in IMPAC II so that the R00 PD
   selected in the request can be automatically assigned to the grant application when the request gets fully approved.
 </p>

 <p style="color: #A0A0A0;">
   This is an automated email.  Please do not reply.  Questions about this email should be sent to
   <a href="#" th:href="@{''mailto:'' + ${nciI2eSupport}}"><span th:text="${nciI2eSupport}"></span> </a>
 </p>
 </body>
 </html>
',
'Y', SYSDATE, 'NCI', null, null);
