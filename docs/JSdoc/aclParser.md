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
<dt><a href="#aclPredicates">aclPredicates</a></dt>
<dd><p>const aclPredicates = [&#39;agent&#39;, &#39;agentClass&#39;, &#39;agentGroup&#39;, &#39;origin&#39;, &#39;default&#39;]</p>
<p>aclObject is a string, aclPredicates related :</p>
<ul>
<li>agent: webId, bot, application, ...</li>
<li>agentClass: &#39;agent&#39;</li>
<li>agentGroup: URI</li>
<li>origin: origin url</li>
<li>default: &#39;&#39; (blank string)</li>
</ul>
</dd>
</dl>

## Functions

<dl>
<dt><a href="#aclMode">aclMode(itemUrl, aclContent, s, p, o, options)</a></dt>
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
    * [.contentParser(url, aclcontent)](#solidAPI.acl+contentParser) ⇒ <code>object</code>
    * [.createContent(url, aclAgents)](#solidAPI.acl+createContent) ⇒ <code>string</code>
    * [.addUserMode(aclAgents, userAgent, userMode)](#solidAPI.acl+addUserMode) ⇒ <code>object</code>
    * [.deleteUserMode(aclAgents, userAgent, userMode)](#solidAPI.acl+deleteUserMode) ⇒ <code>object</code>
    * [.makeContentRelative(aclcontent, itemUrl, toName, options)](#solidAPI.acl+makeContentRelative)
    * [.isValidAcl(itemUrl, content, URI, options)](#solidAPI.acl+isValidAcl)
    * [.isValidRDF(itemUrl, content)](#solidAPI.acl+isValidRDF)

<a name="solidAPI.acl+contentParser"></a>

### solidAPI.acl.contentParser(url, aclcontent) ⇒ <code>object</code>
aclcontent parser

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>object</code> - aclAgents  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | resource |
| aclcontent | <code>string</code> | of url.acl |

<a name="solidAPI.acl+createContent"></a>

### solidAPI.acl.createContent(url, aclAgents) ⇒ <code>string</code>
create turtle aclcontent for url resource from aclAgents object

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>string</code> - text/turtle aclContent  

| Param | Type | Description |
| --- | --- | --- |
| url | <code>string</code> | ressource (not url.acl) |
| aclAgents | <code>object</code> |  |

<a name="solidAPI.acl+addUserMode"></a>

### solidAPI.acl.addUserMode(aclAgents, userAgent, userMode) ⇒ <code>object</code>
modify aclAgents object by adding agents and/or modes

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>object</code> - aclAgents  

| Param | Type | Description |
| --- | --- | --- |
| aclAgents | <code>object</code> |  |
| userAgent | <code>array</code> | array of objects { aclPredicate: aclObject } |
| userMode | <code>array</code> | ['Read'] |

<a name="solidAPI.acl+deleteUserMode"></a>

### solidAPI.acl.deleteUserMode(aclAgents, userAgent, userMode) ⇒ <code>object</code>
modify aclAgents object by removing agents and/or modes

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Returns**: <code>object</code> - aclAgents  

| Param | Type | Description |
| --- | --- | --- |
| aclAgents | <code>object</code> |  |
| userAgent | <code>array</code> | array of objects { aclPredicate: aclObject } |
| userMode | <code>array</code> | ['Read'] |

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

### solidAPI.acl.isValidAcl(itemUrl, content, URI, options)
URI can be any valid Agent (person, group, software Bot)
check that URI or Public has control and that the acl is well-formed
URI is usually the webId checked to have 'Control' authorization
'aclDefault: 'must' (none spec compliant) one acl: Default is needed for folder ACL
'must' : spec compliant acl: Authorization is an obligation

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  
**Result**: <code>object</code> { err: [blocking errors], info: [non blocking anomalies]}  

| Param | Type | Description |
| --- | --- | --- |
| itemUrl | <code>string</code> |  |
| content | <code>string</code> |  |
| URI | <code>string</code> |  |
| options | <code>object</code> | { aclAuth: 'must'-'may' } { aclDefault: 'must'-'may' } |

<a name="solidAPI.acl+isValidRDF"></a>

### solidAPI.acl.isValidRDF(itemUrl, content)
is valid RDF

**Kind**: instance method of [<code>solidAPI.acl</code>](#solidAPI.acl)  

| Param | Type |
| --- | --- |
| itemUrl | <code>string</code> | 
| content | <code>string</code> | 

<a name="aclModes"></a>

## aclModes
const aclModes = ['Read', 'Append', 'Write', 'Control']

**Kind**: global constant  
<a name="aclPredicates"></a>

## aclPredicates
const aclPredicates = ['agent', 'agentClass', 'agentGroup', 'origin', 'default']

aclObject is a string, aclPredicates related :
- agent: webId, bot, application, ...
- agentClass: 'agent'
- agentGroup: URI
- origin: origin url
- default: '' (blank string)

**Kind**: global constant  
<a name="aclMode"></a>

## aclMode(itemUrl, aclContent, s, p, o, options)
Check if a user or everybody has an auth

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| itemUrl | <code>string</code> |  |
| aclContent | <code>string</code> |  |
| s | <code>object</code> | to check a specific block ( null for all] |
| p | <code>object</code> | to check a specific agent type (null for all) |
| o | <code>object</code> | URI of person, group, bot, trusted app, .... |
| options | <code>object</code> | { aclMode: 'Control' } by default |

<a name="checkAcl"></a>

## checkAcl(itemUrl, aclContent, options)
**Kind**: global function  

| Param | Type |
| --- | --- |
| itemUrl | <code>string</code> | 
| aclContent | <code>string</code> | 
| options | <code>object</code> | 

