## Classes

<dl>
<dt><a href="#solidAPI.acl">solidAPI.acl</a></dt>
<dd><p>Class for working with ACL
using an aclAgents object</p>
</dd>
</dl>

## Constants

<dl>
<dt><a href="#aclModes">aclModes</a></dt>
<dd><p>const aclModes = [&#39;Read&#39;, &#39;Append&#39;, &#39;Write&#39;, &#39;Control&#39;]</p>
</dd>
<dt><a href="#aclAccesses">aclAccesses</a></dt>
<dd><p>const aclAccesses = [&#39;accessTo&#39;, &#39;default&#39;]</p>
</dd>
<dt><a href="#aclPredicates">aclPredicates</a></dt>
<dd><p>const aclPredicates = [&#39;agent&#39;, &#39;agentClass&#39;, &#39;agentGroup&#39;, &#39;origin&#39;, &#39;default&#39;]</p>
<p>aclObject is a string, aclPredicates related :</p>
<ul>
<li>agent: webId, bot, application, ...</li>
<li>agentClass: &#39;Agent&#39;</li>
<li>agentGroup: URI</li>
<li>origin: origin url</li>
<li>default: &#39;&#39; (blank string)</li>
</ul>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#aclMode">aclMode(itemUrl, aclContent, options)</a></dt>
<dd><p>Check if a user or everybody has an auth</p>
</dd>
<dt><a href="#checkAcl">checkAcl(itemUrl, aclContent, options)</a></dt>
<dd></dd>
</dl>

<a name="solidAPI.acl"></a>

## solidAPI.acl
Class for working with ACL
using an aclAgents object

**Kind**: global class  

* [solidAPI.acl](#solidAPI.acl)
    * [.contentParser(url, aclcontent)](#solidAPI.acl+contentParser) ⇒ <code>object</code> \| <code>array</code>
    * [.createContent(url, aclAgents, options)](#solidAPI.acl+createContent) ⇒ <code>string</code>
    * [.addUserMode(aclAgents, userAgent, userMode, userAccess)](#solidAPI.acl+addUserMode) ⇒ <code>object</code>
    * [.deleteUserMode(aclAgents, userAgent, userMode, userAccess)](#solidAPI.acl+deleteUserMode) ⇒ <code>object</code>
    * [.makeContentRelative(aclcontent, itemUrl, toName, options)](#solidAPI.acl+makeContentRelative)
    * [.isValidAcl(itemUrl, content, options)](#solidAPI.acl+isValidAcl)
    * [.isValidRDF(itemUrl, content, options)](#solidAPI.acl+isValidRDF)

<a name="solidAPI.acl+contentParser"></a>

### solidAPI.acl.contentParser(url, aclcontent) ⇒ <code>object</code> \| <code>array</code>
aclcontent parser

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>object</code> \| <code>array</code> - aclAgents Object or Array of Objects  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | resource |
| aclcontent | <code>string</code> | of url.acl |

<a name="solidAPI.acl+createContent"></a>

### solidAPI.acl.createContent(url, aclAgents, options) ⇒ <code>string</code>
create turtle aclcontent for url resource from aclAgents object

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>string</code> - text/turtle aclContent  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | ressource (not url.acl) |
| aclAgents | <code>object</code> \| <code>array</code> | object or Array of objects |
| options | <code>object</code> | for isValidAcl() |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| 'may' | <code>options.aclDefault</code> | ('must' is more prudent) |
| 'Control' | <code>options.aclMode</code> |  |
| if | <code>options.URI</code> | used check that at least this URI has 'Control' |

<a name="solidAPI.acl+addUserMode"></a>

### solidAPI.acl.addUserMode(aclAgents, userAgent, userMode, userAccess) ⇒ <code>object</code>
modify aclAgents object by adding agents and/or modes and/or access types

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>object</code> - aclAgents  

| Param | Type | Description |
| --- | --- | --- |
| aclAgents | <code>object</code> |  |
| userAgent | <code>array</code> | array of objects { aclPredicate: aclObject } |
| userMode | <code>array</code> | ['Read'] |
| userAccess | <code>array</code> |  |

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| default | <code>userAccess</code> | value ['accessTo', 'default'] |

<a name="solidAPI.acl+deleteUserMode"></a>

### solidAPI.acl.deleteUserMode(aclAgents, userAgent, userMode, userAccess) ⇒ <code>object</code>
modify aclAgents object by removing agents and/or modes

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>object</code> - aclAgents  

| Param | Type | Description |
| --- | --- | --- |
| aclAgents | <code>object</code> |  |
| userAgent | <code>array</code> | array of objects { aclPredicate: aclObject } |
| userMode | <code>array</code> | ['Read'] |
| userAccess | <code>array</code> | ['accessTo', 'default'] |

<a name="solidAPI.acl+makeContentRelative"></a>

### solidAPI.acl.makeContentRelative(aclcontent, itemUrl, toName, options)
Make aclContent relative to url resource
- make absolute paths relative to folder
- make relative paths to pod relative to folder
- update relative paths to the new location

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  

| Param | Type | Description |
| --- | --- | --- |
| aclcontent | <code>string</code> |  |
| itemUrl | <code>string</code> | resource url (not an url.acl) |
| toName | <code>string</code> | destination name ('' or file name) |
| options | <code>object</code> | for agent |

<a name="solidAPI.acl+isValidAcl"></a>

### solidAPI.acl.isValidAcl(itemUrl, content, options)
check that atleast an agent type has control and that the acl is well-formed
URI is usually the webId checked to have 'Control' authorization
aclDefault: 'may' (spec compliant), if 'must' then one acl: Default is needed for folder ACL
aclAuth 'must' : spec compliant acl: Authorization is mandatory

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Result**: <code>object</code> { err: [blocking errors], info: [non blocking anomalies]}  

| Param | Type |
| --- | --- |
| itemUrl | <code>string</code> | 
| content | <code>string</code> | 
| options | <code>object</code> | 

**Properties**

| Name | Type |
| --- | --- |
| 'Control' | <code>options.aclMode</code> | 
| 'must' | <code>options.aclAuth</code> | 
| 'may' | <code>options.aclDefault</code> | 

<a name="solidAPI.acl+isValidRDF"></a>

### solidAPI.acl.isValidRDF(itemUrl, content, options)
is valid RDF (parses with N3.js)

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  

| Param | Type |
| --- | --- |
| itemUrl | <code>string</code> | 
| content | <code>string</code> | 
| options | <code>object</code> | 

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| default | <code>options.baseIRI</code> | to itemUrl |
| none|'text/n3' | <code>options.format</code> |  |

<a name="aclModes"></a>

## aclModes
const aclModes = ['Read', 'Append', 'Write', 'Control']

**Kind**: global constant  
<a name="aclAccesses"></a>

## aclAccesses
const aclAccesses = ['accessTo', 'default']

**Kind**: global constant  
<a name="aclPredicates"></a>

## aclPredicates
const aclPredicates = ['agent', 'agentClass', 'agentGroup', 'origin', 'default']

aclObject is a string, aclPredicates related :
- agent: webId, bot, application, ...
- agentClass: 'Agent'
- agentGroup: URI
- origin: origin url
- default: '' (blank string)

**Kind**: global constant  
<a name="aclMode"></a>

## aclMode(itemUrl, aclContent, options)
Check if a user or everybody has an auth

**Kind**: global function  

| Param | Type |
| --- | --- |
| itemUrl | <code>string</code> | 
| aclContent | <code>string</code> | 
| options | <code>object</code> | 

**Properties**

| Name | Type | Description |
| --- | --- | --- |
| 'Control' | <code>options.aclMode</code> | by default |
| check | <code>options.URI</code> | for 'Control' for a single URI : person, group, .... |

<a name="checkAcl"></a>

## checkAcl(itemUrl, aclContent, options)
**Kind**: global function  

| Param | Type |
| --- | --- |
| itemUrl | <code>string</code> | 
| aclContent | <code>string</code> | 
| options | <code>object</code> | 

