# Funding Selections

## Action Items
- [ ] Document standards and usage
- [ ] Document best practices
- [ ] Code review
- [X] Error logging - how to get console logs for diagnostics?
- [X] Heartbeat service - parameterize magic numbers
- [X] Add size constraints to userQueue and logQueue in custom logging service
- [ ] ~~Use custom logger as proxy for all log calls to NGXLogger~~
- [ ] Check for errors in 'CanDeactivate' methods
- [X] Fix the stupid router issue with 5 login windows during initialization...
- [X] Evaluate errors in logging service and set up circuit-breaker
- [ ] Review and evaluate all logging statements
- [ ] Break circular dependency between HeartbeatService and CustomLogger
- [ ] Migrate HeartbeatService, CustomLogger, and any dependencies to common UI (which should be renamed)
- [ ] Standardize %Cut pipes - we have multiple.
- [ ] Convert back to using NGXLogger instead of CustomLogger so we get file names and line numbers in messages.
- [ ] Either start using them, or delete all component spec.ts files
- [ ] When we can upgrade NGXLogger, modify to attach diagnostic payload and delete CustomLogger
- [ ] Move ROLLUP_TYPES and PRE_APPL_TYPES from CreateTypeComponent to FundingRequestTypes
- [ ] Build mock servers with API definition to simplify local development and testing

## Create new UI components

**NOTE:** FS-specific components should go here.  Shared components go into sm_i2e_common_ui.  If you're not sure, put it here and we'll worry about it later.

``` ng generate component <optional_path>\<component_name>```


# Best Practices

- Create a shared Model object that can be injected into components.
- Check out what everyone else is doing an make sure you understand it
- Don't reinvent the wheel - look at existing packages and available functionality
- The model should contain all the data a component might need
- Keep reusability in mind
