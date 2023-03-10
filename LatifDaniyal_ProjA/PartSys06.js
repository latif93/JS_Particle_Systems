//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)

// Set 'tab' to 2 spaces (for best on-screen appearance)

/*
================================================================================
================================================================================

                              PartSys Library

================================================================================
================================================================================
Prototype object that contains one complete particle system, including:
 -- state-variables s1, s2, & more that each describe a complete set of 
  particles at a fixed instant in time. Each state-var is a Float32Array that 
  hold the parameters of this.targCount particles (defined by constructor).
 -- Each particle is an identical sequence of floating-point parameters defined 
  by the extensible set of array-index names defined as constants near the top 
  of this file.  For example: PART_XPOS for x-coordinate of position, PART_YPOS 
  for particle's y-coord, and finally PART_MAXVAL defines total # of parameters.
  To access parameter PART_YVEL of the 17th particle in state var s1, use:
  this.s1[PART_YVEL + 17*PART_MAXVAL].
 -- A collection of 'force-causing' objects in forceList array
                                                  (see CForcer prototype below),
 -- A collection of 'constraint-imposing' objects in limitList array
                                                  (see CLimit prototype below),
 -- Particle-system computing functions described in class notes: 
  init(), applyForces(), dotFinder(), render(), doConstraints(), swap().
 
 HOW TO USE:
 ---------------
 a) Be sure your WebGL rendering context is available as the global var 'gl'.
 b) Create a global variable for each independent particle system:
  e.g.    g_PartA = new PartSys(500);   // 500-particle fire-like system 
          g_partB = new PartSys(32);    //  32-particle spring-mass system
          g_partC = new PartSys(1024);  // 1024-particle smoke-like system
          ...
 c) Modify each particle-system as needed to get desired results:
    g_PartA.init(3);  g_PartA.solvType = SOLV_ADAMS_BASHFORTH; etc...
 d) Be sure your program's animation method (e.g. 'drawAll') calls the functions
    necessary for the simulation process of all particle systems, e.g.
      in main(), call g_partA.init(), g_partB.init(), g_partC.init(), ... etc
      in drawAll(), call:
        g_partA.applyForces(), g_partB.applyForces(), g_partC.applyForces(), ...
        g_partA.dotFinder(),   g_partB.dotFinder(),   g_partC.dotFinder(), ...
        g_partA.render(),      g_partB.render(),      g_partC.render(), ...
        g_partA.solver(),      g_partB.solver(),      g_partC.solver(), ...
        g_partA.doConstraint(),g_partB.doConstraint(),g_partC.doConstraint(),...
        g_partA.swap(),        g_partB.swap(),        g_partC.swap().

*/

// Array-name consts for all state-variables in PartSys object:
/*------------------------------------------------------------------------------
     Each state-variable is a Float32Array object that holds 'this.partCount' 
particles. For each particle the state var holds exactly PART_MAXVAR elements 
(aka the 'parameters' of the particle) arranged in the sequence given by these 
array-name consts below.  
     For example, the state-variable object 'this.s1' is a Float32Array that 
holds this.partCount particles, and each particle is described by a sequence of
PART_MAXVAR floating-point parameters; in other words, the 'stride' that moves
use from a given parameter in one particle to the same parameter in the next
particle is PART_MAXVAR. Suppose we wish to find the Y velocity parameter of 
particle number 17 in s1 ('first' particle is number 0): we can
get that value if we write: this.s1[PART_XVEL + 17*PART_MAXVAR].
------------------------------------------------------------------------------*/
const PART_XPOS     = 0;  //  position    
const PART_YPOS     = 1;
const PART_ZPOS     = 2;
const PART_WPOS     = 3;            // (why include w? for matrix transforms; 
                                    // for vector/point distinction
const PART_XVEL     = 4;  //  velocity -- ALWAYS a vector: x,y,z; no w. (w==0)    
const PART_YVEL     = 5;
const PART_ZVEL     = 6;
const PART_X_FTOT   = 7;  // force accumulator:'ApplyForces()' fcn clears
const PART_Y_FTOT   = 8;  // to zero, then adds each force to each particle.
const PART_Z_FTOT   = 9;        
const PART_R        =10;  // color : red,green,blue, alpha (opacity); 0<=RGBA<=1.0
const PART_G        =11;  
const PART_B        =12;
const PART_MASS     =13;  	// mass, in kilograms
const PART_DIAM 	  =14;	// on-screen diameter (in pixels)
const PART_RENDMODE =15;	// on-screen appearance (square, round, or soft-round)
 // Other useful particle values, currently unused
const PART_AGE      =16;  // # of frame-times until re-initializing (Reeves Fire)
/*
const PART_CHARGE   =17;  // for electrostatic repulsion/attraction
const PART_MASS_VEL =18;  // time-rate-of-change of mass.
const PART_MASS_FTOT=19;  // force-accumulator for mass-change
const PART_R_VEL    =20;  // time-rate-of-change of color:red
const PART_G_VEL    =21;  // time-rate-of-change of color:grn
const PART_B_VEL    =22;  // time-rate-of-change of color:blu
const PART_R_FTOT   =23;  // force-accumulator for color-change: red
const PART_G_FTOT   =24;  // force-accumulator for color-change: grn
const PART_B_FTOT   =25;  // force-accumulator for color-change: blu
*/
const PART_MAXVAR   =17;  // Size of array in CPart uses to store its values.


// Array-Name consts that select PartSys objects' numerical-integration solver:
//------------------------------------------------------------------------------
// EXPLICIT methods: GOOD!
//    ++ simple, easy to understand, fast, but
//    -- Requires tiny time-steps for stable stiff systems, because
//    -- Errors tend to 'add energy' to any dynamical system, driving
//        many systems to instability even with small time-steps.
const SOLV_EULER       = 0;       // Euler integration: forward,explicit,...
const SOLV_MIDPOINT    = 1;       // Midpoint Method (see Pixar Tutorial)
const SOLV_ADAMS_BASH  = 2;       // Adams-Bashforth Explicit Integrator
const SOLV_RUNGEKUTTA  = 3;       // Arbitrary degree, set by 'solvDegree'

// IMPLICIT methods:  BETTER!
//          ++Permits larger time-steps for stiff systems, but
//          --More complicated, slower, less intuitively obvious,
//          ++Errors tend to 'remove energy' (ghost friction; 'damping') that
//              aids stability even for large time-steps.
//          --requires root-finding (iterative: often no analytical soln exists)
const SOLV_OLDGOOD     = 4;      //  early accidental 'good-but-wrong' solver
const SOLV_BACK_EULER  = 5;      // 'Backwind' or Implicit Euler
const SOLV_BACK_MIDPT  = 6;      // 'Backwind' or Implicit Midpoint
const SOLV_BACK_ADBASH = 7;      // 'Backwind' or Implicit Adams-Bashforth

// SEMI-IMPLICIT METHODS: BEST?
//          --Permits larger time-steps for stiff systems,
//          ++Simpler, easier-to-understand than Implicit methods
//          ++Errors tend to 'remove energy) (ghost friction; 'damping') that
//              aids stability even for large time-steps.
//          ++ DOES NOT require the root-finding of implicit methods,
const SOLV_VERLET      = 8;       // Verlet semi-implicit integrator;
const SOLV_VEL_VERLET  = 9;       // 'Velocity-Verlet'semi-implicit integrator
const SOLV_LEAPFROG    = 10;      // 'Leapfrog' integrator
const SOLV_MAX         = 11;      // number of solver types available.

const NU_EPSILON  = 10E-15;         // a tiny amount; a minimum vector length
                                    // to use to avoid 'divide-by-zero'
  var g_EyeX = 0, g_EyeY =0, g_EyeZ = 0.5; 
  var theta = 47;  
  var deltaZ = -0.1;
//=============================================================================
//==============================================================================
function PartSys() {
//==============================================================================
//=============================================================================
// Constructor for a new particle system.
this.VSHADER_SOURCE =
'uniform mat4 u_ModelMatrix;\n' +
  'precision mediump float;\n' +				// req'd in OpenGL ES if we use 'float'
  //
  'uniform   int u_runMode; \n' +					// particle system state: 
  'attribute vec4 a_Position;\n' +
  'varying   vec4 v_Color; \n' +
  'void main() {\n' +
  '  gl_PointSize = 10.0;\n' +            // TRY MAKING THIS LARGER...
  '	 gl_Position = u_ModelMatrix * a_Position; \n' +	
	// Let u_runMode determine particle color:
  '  if(u_runMode == 0) { \n' +
	'	   v_Color = vec4(1.0, 0.0, 0.0, 1.0);	\n' +		// red: 0==reset
	'  	 } \n' +
	'  else if(u_runMode == 1) {  \n' +
	'    v_Color = vec4(1.0, 1.0, 0.0, 1.0); \n' +	// yellow: 1==pause
	'    }  \n' +
	'  else if(u_runMode == 2) { \n' +    
	'    v_Color = vec4(1.0, 1.0, 1.0, 1.0); \n' +	// white: 2==step
  '    } \n' +
	'  else { \n' +
	'    v_Color = vec4(0, 0, 0, 1.0); \n' +	// green: >3==run
	'		 } \n' +
  '} \n';
// Each instance computes all the on-screen attributes for just one VERTEX,
// supplied by 'attribute vec4' variable a_Position, filled from the 
// Vertex Buffer Object (VBO) we created inside the graphics hardware by calling 
// the 'initVertexBuffers()' function. 

//==============================================================================
// Fragment shader program:
this.FSHADER_SOURCE =
'precision mediump float;\n' +
'varying vec4 v_Color; \n' +
'void main() {\n' +
'  float dist = distance(gl_PointCoord, vec2(0.5, 0.5)); \n' +
'  if( 0.2 < gl_PointCoord.s) { \n' + 
'  	gl_FragColor = vec4((1.0-2.0*dist)*v_Color.rgb, 1.0);\n' +
'  } else { discard; }\n' +
'}\n';
  this.randX = 0;   // random point chosen by call to roundRand()
  this.randY = 0;
  this.randZ = 0;
  this.isRope = false;
  this.isTor = false;
  this.isFire = false;
  this.isFountain = 0;  // Press 'f' or 'F' key to toggle; if 1, apply age 
                        // age constraint, which re-initializes particles whose
                        // lifetime falls to zero, forming a 'fountain' of
                        // freshly re-initialized bouncy-balls.
  this.forceList = [];            // (empty) array to hold CForcer objects
                                  // for use by ApplyAllForces().
                                  // NOTE: this.forceList.push("hello"); appends
                                  // string "Hello" as last element of forceList.
                                  // console.log(this.forceList[0]); prints hello.
  this.limitList = [];            // (empty) array to hold CLimit objects
                                  // for use by doContstraints()
}
// HELPER FUNCTIONS:
//=====================
// Misc functions that don't fit elsewhere

PartSys.prototype.roundRand = function() {
//==============================================================================
// When called, find a new 3D point (this.randX, this.randY, this.randZ) chosen 
// 'randomly' and 'uniformly' inside a sphere of radius 1.0 centered at origin.  
//		(within this sphere, all regions of equal volume are equally likely to
//		contain the the point (randX, randY, randZ, 1).

	do {			// RECALL: Math.random() gives #s with uniform PDF between 0 and 1.
		this.randX = 2.0*Math.random() -1.0; // choose an equally-likely 2D point
		this.randY = 2.0*Math.random() -1.0; // within the +/-1 cube, but
		this.randZ = 2.0*Math.random() -1.0;

		}       // is x,y,z outside sphere? try again!
	while(this.randX*this.randX + 
	      this.randY*this.randY + 
	      this.randZ*this.randZ >= 1.0); 
}

// INIT FUNCTIONS:
//==================
// Each 'init' function initializes everything in our particle system. Each 
// creates all necessary state variables, force-applying objects, 
// constraint-applying objects, solvers and all other values needed to prepare
// the particle-system to run without any further adjustments.

PartSys.prototype.initBouncy2D = function(count) {




}

PartSys.prototype.initPlanets = function() {


//==============================================================================
  // Create all state-variables-------------------------------------------------
  this.partCount = 2;
 // makeGroundGrid();
  //this.allVBO = new Float32Array(this.partCount * PART_MAXVAR + gndVerts.length + 34);
  this.s1 =    new Float32Array(this.partCount * PART_MAXVAR);
  this.s2 =    new Float32Array(this.partCount * PART_MAXVAR);
  this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);  
  this.springParts = new Float32Array([0.0, 0.0, 0.0, 1.0,
                                       40.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0,
                                       1.0, 1.0, 1.0,
                                       1.0, 2.0 + 10*Math.random(), 0.0,
                                       30 + 100*Math.random(),
                                       1.0, 0.0, 0.0, 1.0,
                                       0.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0,
                                       1.0, 1.0, 1.0,
                                       1.0, 2.0 + 10*Math.random(), 0.0,
                                       30 + 100*Math.random()]);
  this.isRope = false;
  this.isTor = false;
  this.isFire = false;
        // NOTE: Float32Array objects are zero-filled by default.
  // Create & init all force-causing objects------------------------------------

  // drag for all particles:

                                  // the forceList array of force-causing objects.
  fTmp = new CForcer();           // create a NEW CForcer object 
                                  // (WARNING! until we do this, fTmp refers to
                                  // the same memory locations as forceList[0]!!!) 
  fTmp.forceType = F_DRAG;        // Viscous Drag
  fTmp.Kdrag = 0.15;              // in Euler solver, scales velocity by 0.85
  fTmp.targFirst = 0;             // apply it to ALL particles:
  fTmp.partCount = -1;            // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp);      // append this 'gravity' force object to 
  
                                  // the forceList array of force-causing objects.
  fTmp = new CForcer();           // create a NEW CForcer object 
                                  // (WARNING! until we do this, fTmp refers to
                                  // the same memory locations as forceList[0]!!!) 
  fTmp.forceType = F_GRAV_P;        // Viscous Drag              // in Euler solver, scales velocity by 0.85
  fTmp.targFirst = 0;             // apply it to ALL particles:   
  fTmp.partCount = -1;
  fTmp.e1 = 0;
  //ftmp.e2;
                                  // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp);      // append this 'gravity' force object to 
  // Report:
  console.log("\t\t", this.forceList.length, "CForcer objects:");
  for(i=0; i<this.forceList.length; i++) {
    console.log("CForceList[",i,"]");
    this.forceList[i].printMe();
    }                   

  // Create & init all constraint-causing objects-------------------------------
  var cTmp = new CLimit();      // creat constraint-causing object, and
  cTmp.hitType = HIT_BOUNCE_VEL;  // set how particles 'bounce' from its surface,
  cTmp.limitType = LIM_VOL;       // confine particles inside axis-aligned 
                                  // rectangular volume that
  cTmp.targFirst = 0;             // applies to ALL particles; starting at 0 
  cTmp.partCount = -1;            // through all the rest of them.
  cTmp.xMin = -1.0; cTmp.xMax = 1.0;  // box extent:  +/- 1.0 box at origin
  cTmp.yMin = -1.0; cTmp.yMax = 1.0;
  cTmp.zMin = -1.0; cTmp.zMax = 1.0;
  cTmp.Kresti = 1.0;              // bouncyness: coeff. of restitution.
                                  // (and IGNORE all other CLimit members...)
  this.limitList.push(cTmp);      // append this 'box' constraint object to the
                                  // 'limitList' array of constraint-causing objects.                                
  // Report:
  console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
  console.log("\t\t", this.limitList.length, "CLimit objects.");

  this.INIT_VEL =  0.15 * 60.0;		// initial velocity in meters/sec.
	                  // adjust by ++Start, --Start buttons. Original value 
										// was 0.15 meters per timestep; multiply by 60 to get
                    // meters per second.
  this.drag = 0.985;// units-free air-drag (scales velocity); adjust by d/D keys
  this.grav = 9.832;// gravity's acceleration(meter/sec^2); adjust by g/G keys.
	                  // on Earth surface, value is 9.832 meters/sec^2.
  this.resti = 1.0; // units-free 'Coefficient of Restitution' for 
	                  // inelastic collisions.  Sets the fraction of momentum 
										// (0.0 <= resti < 1.0) that remains after a ball 
										// 'bounces' on a wall or floor, as computed using 
										// velocity perpendicular to the surface. 
										// (Recall: momentum==mass*velocity.  If ball mass does 
										// not change, and the ball bounces off the x==0 wall,
										// its x velocity xvel will change to -xvel * resti ).
	this.isFountain = 0;
  //--------------------------init Particle System Controls:
  this.runMode =  3;// Master Control: 0=reset; 1= pause; 2=step; 3=run
  this.solvType = SOLV_OLDGOOD;// adjust by s/S keys.
                    // SOLV_EULER (explicit, forward-time, as 
										// found in BouncyBall03.01BAD and BouncyBall04.01badMKS)
										// SOLV_OLDGOOD for special-case implicit solver, reverse-time, 
										// as found in BouncyBall03.GOOD, BouncyBall04.goodMKS)
  this.bounceType = 1;	// floor-bounce constraint type:
										// ==0 for velocity-reversal, as in all previous versions
										// ==1 for Chapter 3's collision resolution method, which
										// uses an 'impulse' to cancel any velocity boost caused
										// by falling below the floor.
										
//--------------------------------Create & fill VBO with state var s1 contents:
// INITIALIZE s1, s2:
//  NOTE: s1,s2 are a Float32Array objects, zero-filled by default.
// That's OK for most particle parameters, but these need non-zero defaults:

  var j = 0;  // i==particle number; j==array index for i-th particle
  for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
    this.roundRand();       // set this.randX,randY,randZ to random location in 
                            // a 3D unit sphere centered at the origin.
    //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
    // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
    this.s1[j + PART_XPOS] = -0.8 + 0.1*this.randX; 
    this.s1[j + PART_YPOS] = -0.8 + 0.1*this.randY;  
    this.s1[j + PART_ZPOS] = -0.8 + 0.1*this.randZ;
    this.s1[j + PART_WPOS] =  1.0;      // position 'w' coordinate;
    this.roundRand(); // Now choose random initial velocities too:
    this.s1[j + PART_XVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randX);
    this.s1[j + PART_YVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randY);
    this.s1[j + PART_ZVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randZ);
    this.s1[j + PART_MASS] =  1.0;      // mass, in kg.
    this.s1[j + PART_DIAM] =  2.0 + 10*Math.random(); // on-screen diameter, in pixels
    this.s1[j + PART_RENDMODE] = 0.0;
    this.s1[j + PART_AGE] = 30 + 100*Math.random();
    //----------------------------
    this.s2.set(this.s1);   // COPY contents of state-vector s1 to s2.
  }

  this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE);
  if (!this.shaderLoc) {
    console.log(this.constructor.name + 
                '.init() failed to create shaders on gpu');
    return;
  }
  
  // a) select our shader program:
  gl.useProgram(this.shaderLoc);	
  //		Each call to useProgram() selects a shader program from the GPU memory,
  // but that's all -- it does nothing else!  Any previously used shader program's 
  // connections to attributes and uniforms are now invalid, and thus we must now
  // establish new connections between our shader program's attributes and the VBO
  // we wish to use.  
    
  this.FSIZE = this.s1.BYTES_PER_ELEMENT;  // 'float' size, in bytes.
  // Create a vertex buffer object (VBO) in the graphics hardware: get its ID# 
    this.vboID = gl.createBuffer();
    if (!this.vboID) {
      console.log('PartSys.init() Failed to create the VBO object in the GPU');
      return -1;
    }
  
  
  
  
    //for(i=0, j=0; j< gndVerts.length; i++, j++) {
    //verticesTwo[i] = gndVerts[j];
    //  vtwocount++;	
    //}
    gl.program = this.shaderLoc;  
  
    // "Bind the new buffer object (memory in the graphics system) to target"
    // In other words, specify the usage of one selected buffer object.
    // What's a "Target"? it's the poorly-chosen OpenGL/WebGL name for the 
    // intended use of this buffer's memory; so far, we have just two choices:
    //	== "gl.ARRAY_BUFFER" meaning the buffer object holds actual values we 
    //      need for rendering (positions, colors, normals, etc), or 
    //	== "gl.ELEMENT_ARRAY_BUFFER" meaning the buffer object holds indices 
    // 			into a list of values we need; indices such as object #s, face #s, 
    //			edge vertex #s.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);
  
    //for(i = this.partCount*PART_MAXVAR, j = 0; 
    //  j < gndVerts.length; i++, j++){
    //  this.s1[i] = gndVerts[j];
    //}
  
   // for(i=this.partCount * PART_MAXVAR, j=0; j< gndVerts.length; i++, j++) {
    //this.allVBO[i] = gndVerts[j];
    //}
    //for(i=this.partCount * PART_MAXVAR + gndVerts.length, j=0; j< this.springParts.length; i++, j++) {
    //  this.allVBO[i] = this.springParts[j];
    //  }
    // Write data from our JavaScript array to graphics systems' buffer object:
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);
    // why 'DYNAMIC_DRAW'? Because we change VBO's content with bufferSubData() later
    
    // ---------Set up all attributes for VBO contents:
    //Get the ID# for the a_Position variable in the graphics hardware
    this.a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
    if(this.a_PositionID < 0) {
      console.log('PartSys.init() Failed to get the storage location of a_Position');
      return -1;
    }
    // Tell GLSL to fill the 'a_Position' attribute variable for each shader with
    // values from the buffer object chosen by 'gl.bindBuffer()' command.
    // websearch yields OpenGL version: 
    //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
  
   
    // ---------Set up all uniforms we send to the GPU:
    // Get graphics system storage location of each uniform our shaders use:
    // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
    this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!this.u_ModelMatrix) { 
      console.log('Failed to get the storage location of u_ModelMatrix');
      return;
    }
  
    this.u_runModeID = gl.getUniformLocation(gl.program, 'u_runMode');
    if(!this.u_runModeID) {
      console.log('PartSys.init() Failed to get u_runMode variable location');
      return;
    }
    // Set the initial values of all uniforms on GPU: (runMode set by keyboard)
    gl.uniform1i(this.u_runModeID, this.runMode);


}

PartSys.prototype.initFireReeves = function(count) {
  //==============================================================================

  this.VSHADER_SOURCE =
  'attribute float age;\n' +
  'uniform mat4 u_ModelMatrix;\n' +
    'precision mediump float;\n' +				// req'd in OpenGL ES if we use 'float'
    //
    'uniform   int u_runMode; \n' +					// particle system state: 
    'attribute vec4 a_Position;\n' +
    'varying   vec4 v_Color; \n' +
    'void main() {\n' +
    '  float ageR = age* 0.009999;\n' + 
    '  float ageG = age *.0001;\n' + 
    '  float ageB = 0.0 * age;\n' + 
    '  gl_PointSize = 11.5;\n' +            // TRY MAKING THIS LARGER...
    '	 gl_Position = u_ModelMatrix * a_Position; \n' +	
    // Let u_runMode determine particle color:
    '  if(u_runMode == 0) { \n' +
    '	   v_Color = vec4(1.0, 0.0, 0.0, 1.0);	\n' +		// red: 0==reset
    '  	 } \n' +
    '  else if(u_runMode == 1) {  \n' +
    '    v_Color = vec4(1.0, 1.0, 0.0, 1.0); \n' +	// yellow: 1==pause
    '    }  \n' +
    '  else if(u_runMode == 2) { \n' +    
    '    v_Color = vec4(1.0, 1.0, 1.0, 1.0); \n' +	// white: 2==step
    '    } \n' +
    '  else { \n' +
    '    v_Color = vec4(ageR, ageG, ageB, 1.0); \n' + 	// green: >3==run
    '		 } \n' +
    '} \n';
  // Each instance computes all the on-screen attributes for just one VERTEX,
  // supplied by 'attribute vec4' variable a_Position, filled from the 
  // Vertex Buffer Object (VBO) we created inside the graphics hardware by calling 
  // the 'initVertexBuffers()' function. 
  
  //==============================================================================
  // Fragment shader program:
  this.FSHADER_SOURCE =
  'precision mediump float;\n' +
  'varying vec4 v_Color; \n' +
  'void main() {\n' +
  '  float dist = distance(gl_PointCoord, vec2(0.5, 0.5)); \n' +
  '  if( dist < 0.5) { \n' + 
  '  	gl_FragColor = vec4((1.0-2.0*dist)*v_Color.rgb, 1.0);\n' +
  '  } else { discard; }\n' +
  '}\n';
//==============================================================================
  // Create all state-variables-------------------------------------------------
  this.partCount = count;
 // makeGroundGrid();
  //this.allVBO = new Float32Array(this.partCount * PART_MAXVAR + gndVerts.length + 34);
  this.s1 =    new Float32Array(this.partCount * PART_MAXVAR);
  this.s2 =    new Float32Array(this.partCount * PART_MAXVAR);
  this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);  
  this.springParts = new Float32Array([0.0, 0.0, 0.0, 1.0,
                                       40.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0,
                                       1.0, 1.0, 1.0,
                                       1.0, 2.0 + 10*Math.random(), 0.0,
                                       30 + 100*Math.random(),
                                       1.0, 0.0, 0.0, 1.0,
                                       0.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0,
                                       1.0, 1.0, 1.0,
                                       1.0, 2.0 + 10*Math.random(), 0.0,
                                       30 + 100*Math.random()]);
    this.isRope = false;
    this.isTor = false;
    this.isFire = true;
        // NOTE: Float32Array objects are zero-filled by default.
  // Create & init all force-causing objects------------------------------------
  var fTmp = new CForcer();       // create a force-causing object, and
  // earth gravity for all particles:
  fTmp.forceType = F_GRAV_E;      // set it to earth gravity, and
  fTmp.targFirst = 0;             // set it to affect ALL particles:
  fTmp.partCount = -1;            // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp);      // append this 'gravity' force object to 
                                  // the forceList array of force-causing objects.
  // drag for all particles:
  fTmp = new CForcer();           // create a NEW CForcer object 
                                  // (WARNING! until we do this, fTmp refers to
                                  // the same memory locations as forceList[0]!!!) 
  fTmp.forceType = F_DRAG;        // Viscous Drag
  fTmp.Kdrag = 0.15;              // in Euler solver, scales velocity by 0.85
  fTmp.targFirst = 0;             // apply it to ALL particles:
  fTmp.partCount = -1;            // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp);      // append this 'gravity' force object to 
                                  // the forceList array of force-causing objects.
   fTmp = new CForcer();           // create a NEW CForcer object 
                                  // (WARNING! until we do this, fTmp refers to
                                  // the same memory locations as forceList[0]!!!) 
  fTmp.forceType = F_DRAG;        // Viscous Drag
  fTmp.Kdrag = 0.15;              // in Euler solver, scales velocity by 0.85
  fTmp.targFirst = 0;             // apply it to ALL particles:
  fTmp.partCount = -1;            // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp);  
  // Report:
  console.log("PartSys.initBouncy2D() created PartSys.forceList[] array of ");
  console.log("\t\t", this.forceList.length, "CForcer objects:");
  for(i=0; i<this.forceList.length; i++) {
    console.log("CForceList[",i,"]");
    this.forceList[i].printMe();
    }                   

  // Create & init all constraint-causing objects-------------------------------
  var cTmp = new CLimit();      // creat constraint-causing object, and
  cTmp.hitType = HIT_BOUNCE_VEL;  // set how particles 'bounce' from its surface,
  cTmp.limitType = LIM_VOL;       // confine particles inside axis-aligned 
                                  // rectangular volume that
  cTmp.targFirst = 0;             // applies to ALL particles; starting at 0 
  cTmp.partCount = -1;            // through all the rest of them.
  cTmp.xMin = -1.0; cTmp.xMax = 1.0;  // box extent:  +/- 1.0 box at origin
  cTmp.yMin = -1.0; cTmp.yMax = 1.0;
  cTmp.zMin = -1.0; cTmp.zMax = 1.0;
  cTmp.Kresti = 1.0;              // bouncyness: coeff. of restitution.
                                  // (and IGNORE all other CLimit members...)
  this.limitList.push(cTmp);      // append this 'box' constraint object to the
                                  // 'limitList' array of constraint-causing objects.                                
  // Report:
  console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
  console.log("\t\t", this.limitList.length, "CLimit objects.");
  this.isFountain = 1;		

  this.INIT_VEL =  0.15 * 60.0;		// initial velocity in meters/sec.
	                  // adjust by ++Start, --Start buttons. Original value 
										// was 0.15 meters per timestep; multiply by 60 to get
                    // meters per second.
  this.drag = 0.985;// units-free air-drag (scales velocity); adjust by d/D keys
  this.grav = 9.832;// gravity's acceleration(meter/sec^2); adjust by g/G keys.
	                  // on Earth surface, value is 9.832 meters/sec^2.
  this.resti = 0.1; // units-free 'Coefficient of Restitution' for 
	                  // inelastic collisions.  Sets the fraction of momentum 
										// (0.0 <= resti < 1.0) that remains after a ball 
										// 'bounces' on a wall or floor, as computed using 
										// velocity perpendicular to the surface. 
										// (Recall: momentum==mass*velocity.  If ball mass does 
										// not change, and the ball bounces off the x==0 wall,
										// its x velocity xvel will change to -xvel * resti ).
										
  //--------------------------init Particle System Controls:
  this.runMode =  3;// Master Control: 0=reset; 1= pause; 2=step; 3=run
  this.solvType = SOLV_OLDGOOD;// adjust by s/S keys.
                    // SOLV_EULER (explicit, forward-time, as 
										// found in BouncyBall03.01BAD and BouncyBall04.01badMKS)
										// SOLV_OLDGOOD for special-case implicit solver, reverse-time, 
										// as found in BouncyBall03.GOOD, BouncyBall04.goodMKS)
  this.bounceType = 1;	// floor-bounce constraint type:
										// ==0 for velocity-reversal, as in all previous versions
										// ==1 for Chapter 3's collision resolution method, which
										// uses an 'impulse' to cancel any velocity boost caused
										// by falling below the floor.
										
//--------------------------------Create & fill VBO with state var s1 contents:
// INITIALIZE s1, s2:
//  NOTE: s1,s2 are a Float32Array objects, zero-filled by default.
// That's OK for most particle parameters, but these need non-zero defaults:


  var j = 0;  // i==particle number; j==array index for i-th particle
  for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
    this.roundRand();       // set this.randX,randY,randZ to random location in 
                            // a 3D unit sphere centered at the origin.
    //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
    // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
    this.s1[j + PART_XPOS] = -0.8 + 0.1*this.randX; 
    this.s1[j + PART_YPOS] = -0.8 + 0.1*this.randY;  
    this.s1[j + PART_ZPOS] = -0.8 + 0.1*this.randZ;
    this.s1[j + PART_WPOS] =  1.0;      // position 'w' coordinate;
    this.roundRand(); // Now choose random initial velocities too:
    this.s1[j + PART_XVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randX);
    this.s1[j + PART_YVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randY);
    this.s1[j + PART_ZVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randZ);
    this.s1[j + PART_MASS] =  1.0;      // mass, in kg.
    this.s1[j + PART_DIAM] =  2.0 + 10*Math.random(); // on-screen diameter, in pixels
    this.s1[j + PART_RENDMODE] = 0.0;
    this.s1[j + PART_AGE] = 30 + 100*Math.random();
    //----------------------------
    this.s2.set(this.s1);   // COPY contents of state-vector s1 to s2.
  }

  this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE);
  if (!this.shaderLoc) {
    console.log(this.constructor.name + 
                '.init() failed to create shaders on gpu');
    return;
  }
  
  // a) select our shader program:
  gl.useProgram(this.shaderLoc);	
  //		Each call to useProgram() selects a shader program from the GPU memory,
  // but that's all -- it does nothing else!  Any previously used shader program's 
  // connections to attributes and uniforms are now invalid, and thus we must now
  // establish new connections between our shader program's attributes and the VBO
  // we wish to use.  
    
  this.FSIZE = this.s1.BYTES_PER_ELEMENT;  // 'float' size, in bytes.
  // Create a vertex buffer object (VBO) in the graphics hardware: get its ID# 
    this.vboID = gl.createBuffer();
    if (!this.vboID) {
      console.log('PartSys.init() Failed to create the VBO object in the GPU');
      return -1;
    }
  
  
  
  
    //for(i=0, j=0; j< gndVerts.length; i++, j++) {
    //verticesTwo[i] = gndVerts[j];
    //  vtwocount++;	
    //}
    gl.program = this.shaderLoc;  
  
    // "Bind the new buffer object (memory in the graphics system) to target"
    // In other words, specify the usage of one selected buffer object.
    // What's a "Target"? it's the poorly-chosen OpenGL/WebGL name for the 
    // intended use of this buffer's memory; so far, we have just two choices:
    //	== "gl.ARRAY_BUFFER" meaning the buffer object holds actual values we 
    //      need for rendering (positions, colors, normals, etc), or 
    //	== "gl.ELEMENT_ARRAY_BUFFER" meaning the buffer object holds indices 
    // 			into a list of values we need; indices such as object #s, face #s, 
    //			edge vertex #s.
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);
  
    //for(i = this.partCount*PART_MAXVAR, j = 0; 
    //  j < gndVerts.length; i++, j++){
    //  this.s1[i] = gndVerts[j];
    //}
  
   // for(i=this.partCount * PART_MAXVAR, j=0; j< gndVerts.length; i++, j++) {
    //this.allVBO[i] = gndVerts[j];
    //}
    //for(i=this.partCount * PART_MAXVAR + gndVerts.length, j=0; j< this.springParts.length; i++, j++) {
    //  this.allVBO[i] = this.springParts[j];
    //  }
    // Write data from our JavaScript array to graphics systems' buffer object:
    gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);
    // why 'DYNAMIC_DRAW'? Because we change VBO's content with bufferSubData() later
    
    // ---------Set up all attributes for VBO contents:
    //Get the ID# for the a_Position variable in the graphics hardware
    this.a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
    if(this.a_PositionID < 0) {
      console.log('PartSys.init() Failed to get the storage location of a_Position');
      return -1;
    }
    // Tell GLSL to fill the 'a_Position' attribute variable for each shader with
    // values from the buffer object chosen by 'gl.bindBuffer()' command.
    // websearch yields OpenGL version: 
    //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
  
    this.u_age = gl.getAttribLocation(gl.program, 'age');
    if(this.u_age < 0) {
      console.log('PartSys.init() Failed to get the storage location of age');
      return -1;
    }
    // ---------Set up all uniforms we send to the GPU:
    // Get graphics system storage location of each uniform our shaders use:
    // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
    this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    if (!this.u_ModelMatrix) { 
      console.log('Failed to get the storage location of u_ModelMatrix');
      return;
    }
  
    this.u_runModeID = gl.getUniformLocation(gl.program, 'u_runMode');
    if(!this.u_runModeID) {
      console.log('PartSys.init() Failed to get u_runMode variable location');
      return;
    }
    // Set the initial values of all uniforms on GPU: (runMode set by keyboard)
    gl.uniform1i(this.u_runModeID, this.runMode);


  }

PartSys.prototype.initTornado = function(count) { 

//==============================================================================
  // Create all state-variables-------------------------------------------------
  this.partCount = count;
 // makeGroundGrid();
  //this.allVBO = new Float32Array(this.partCount * PART_MAXVAR + gndVerts.length + 34);
  this.s1 =    new Float32Array(this.partCount * PART_MAXVAR);
  this.s2 =    new Float32Array(this.partCount * PART_MAXVAR);
  this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);  
  this.springParts = new Float32Array([0.0, 0.0, 0.0, 1.0,
                                       40.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0,
                                       1.0, 1.0, 1.0,
                                       1.0, 2.0 + 10*Math.random(), 0.0,
                                       30 + 100*Math.random(),
                                       1.0, 0.0, 0.0, 1.0,
                                       0.0, 0.0, 0.0,
                                       0.0, 0.0, 0.0,
                                       1.0, 1.0, 1.0,
                                       1.0, 2.0 + 10*Math.random(), 0.0,
                                       30 + 100*Math.random()]);

  this.isRope = false;
  this.isTor = true;
  this.isFire = false;
        // NOTE: Float32Array objects are zero-filled by default.
  // Create & init all force-causing objects------------------------------------
  var fTmp = new CForcer();       // create a force-causing object, and
  // the forceList array of force-causing objects.
fTmp.forceType = F_WIND;        // Viscous Drag                                  // (and IGNORE all other Cforcer members...)
this.forceList.push(fTmp);      // append this 'gravity' force object to 
  var fTmp = new CForcer();       // create a force-causing object, and
  // earth gravity for all particles:
  fTmp.forceType = F_GRAV_E;      // set it to earth gravity, and
  fTmp.targFirst = 0;             // set it to affect ALL particles:
  fTmp.partCount = -1;            // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp);      // append this 'gravity' force object to 
                                  // the forceList array of force-causing objects.
  // drag for all particles:
  fTmp = new CForcer();           // create a NEW CForcer object 
                                  // (WARNING! until we do this, fTmp refers to
                                  // the same memory locations as forceList[0]!!!) 
  fTmp.forceType = F_DRAG;        // Viscous Drag
  fTmp.Kdrag = 0.15;              // in Euler solver, scales velocity by 0.85
  fTmp.targFirst = 0;             // apply it to ALL particles:
  fTmp.partCount = -1;            // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
     this.forceList.push(fTmp);      // append this 'gravity' force object to 

  // Report:
  console.log("PartSys.initBouncy2D() created PartSys.forceList[] array of ");
  console.log("\t\t", this.forceList.length, "CForcer objects:");
  for(i=0; i<this.forceList.length; i++) {
    console.log("CForceList[",i,"]");
    this.forceList[i].printMe();
    }                   

  // Create & init all constraint-causing objects-------------------------------
  var cTmp = new CLimit();      // creat constraint-causing object, and
  cTmp.hitType = HIT_BOUNCE_VEL;  // set how particles 'bounce' from its surface,
  cTmp.limitType = LIM_VOL;       // confine particles inside axis-aligned 
                                  // rectangular volume that
  cTmp.targFirst = 0;             // applies to ALL particles; starting at 0 
  cTmp.partCount = -1;            // through all the rest of them.
  cTmp.xMin = -1.0; cTmp.xMax = 1.0;  // box extent:  +/- 1.0 box at origin
  cTmp.yMin = -1.0; cTmp.yMax = 1.0;
  cTmp.zMin = -1.0; cTmp.zMax = 1.0;
  cTmp.Kresti = 1.0;              // bouncyness: coeff. of restitution.
                                  // (and IGNORE all other CLimit members...)
  this.limitList.push(cTmp);      // append this 'box' constraint object to the
                                  // 'limitList' array of constraint-causing objects.                                
  // Report:
  console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
  console.log("\t\t", this.limitList.length, "CLimit objects.");
  this.isFountain = 1;		

  this.INIT_VEL =  0.15 * 60.0;		// initial velocity in meters/sec.
	                  // adjust by ++Start, --Start buttons. Original value 
										// was 0.15 meters per timestep; multiply by 60 to get
                    // meters per second.
  this.drag = 0.985;// units-free air-drag (scales velocity); adjust by d/D keys
  this.grav = 9.832;// gravity's acceleration(meter/sec^2); adjust by g/G keys.
	                  // on Earth surface, value is 9.832 meters/sec^2.
  this.resti = 1.0; // units-free 'Coefficient of Restitution' for 
	                  // inelastic collisions.  Sets the fraction of momentum 
										// (0.0 <= resti < 1.0) that remains after a ball 
										// 'bounces' on a wall or floor, as computed using 
										// velocity perpendicular to the surface. 
										// (Recall: momentum==mass*velocity.  If ball mass does 
										// not change, and the ball bounces off the x==0 wall,
										// its x velocity xvel will change to -xvel * resti ).
										
  //--------------------------init Particle System Controls:
  this.runMode =  3;// Master Control: 0=reset; 1= pause; 2=step; 3=run
  this.solvType = SOLV_OLDGOOD;// adjust by s/S keys.
                    // SOLV_EULER (explicit, forward-time, as 
										// found in BouncyBall03.01BAD and BouncyBall04.01badMKS)
										// SOLV_OLDGOOD for special-case implicit solver, reverse-time, 
										// as found in BouncyBall03.GOOD, BouncyBall04.goodMKS)
  this.bounceType = 1;	// floor-bounce constraint type:
										// ==0 for velocity-reversal, as in all previous versions
										// ==1 for Chapter 3's collision resolution method, which
										// uses an 'impulse' to cancel any velocity boost caused
										// by falling below the floor.
//--------------------------------Create & fill VBO with state var s1 contents:
// INITIALIZE s1, s2:
//  NOTE: s1,s2 are a Float32Array objects, zero-filled by default.
// That's OK for most particle parameters, but these need non-zero defaults:


  var j = 0;  // i==particle number; j==array index for i-th particle
  for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
    this.roundRand();       // set this.randX,randY,randZ to random location in 
                            // a 3D unit sphere centered at the origin.
    //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
    // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
    this.s1[j + PART_XPOS] = -0.8 + 0.1*this.randX; 
    this.s1[j + PART_YPOS] = -0.8 + 0.1*this.randY;  
    this.s1[j + PART_ZPOS] = -0.8 + 0.1*this.randZ;
    this.s1[j + PART_WPOS] =  1.0;      // position 'w' coordinate;
    this.roundRand(); // Now choose random initial velocities too:
    this.s1[j + PART_XVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randX);
    this.s1[j + PART_YVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randY);
    this.s1[j + PART_ZVEL] =  this.INIT_VEL*(0.4 + 0.2*this.randZ);
    this.s1[j + PART_MASS] =  1.0;      // mass, in kg.
    this.s1[j + PART_DIAM] =  2.0 + 10*Math.random(); // on-screen diameter, in pixels
    this.s1[j + PART_RENDMODE] = 0.0;
    this.s1[j + PART_AGE] = 30 + 100*Math.random();
    //----------------------------
    this.s2.set(this.s1);   // COPY contents of state-vector s1 to s2.
  }



this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE);
if (!this.shaderLoc) {
  console.log(this.constructor.name + 
              '.init() failed to create shaders on gpu');
  return;
}

// a) select our shader program:
gl.useProgram(this.shaderLoc);	
//		Each call to useProgram() selects a shader program from the GPU memory,
// but that's all -- it does nothing else!  Any previously used shader program's 
// connections to attributes and uniforms are now invalid, and thus we must now
// establish new connections between our shader program's attributes and the VBO
// we wish to use.  
  
this.FSIZE = this.s1.BYTES_PER_ELEMENT;  // 'float' size, in bytes.
// Create a vertex buffer object (VBO) in the graphics hardware: get its ID# 
  this.vboID = gl.createBuffer();
  if (!this.vboID) {
    console.log('PartSys.init() Failed to create the VBO object in the GPU');
    return -1;
  }




  //for(i=0, j=0; j< gndVerts.length; i++, j++) {
  //verticesTwo[i] = gndVerts[j];
  //  vtwocount++;	
  //}
  gl.program = this.shaderLoc;  

  // "Bind the new buffer object (memory in the graphics system) to target"
  // In other words, specify the usage of one selected buffer object.
  // What's a "Target"? it's the poorly-chosen OpenGL/WebGL name for the 
  // intended use of this buffer's memory; so far, we have just two choices:
  //	== "gl.ARRAY_BUFFER" meaning the buffer object holds actual values we 
  //      need for rendering (positions, colors, normals, etc), or 
  //	== "gl.ELEMENT_ARRAY_BUFFER" meaning the buffer object holds indices 
  // 			into a list of values we need; indices such as object #s, face #s, 
  //			edge vertex #s.
  gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);

  //for(i = this.partCount*PART_MAXVAR, j = 0; 
  //  j < gndVerts.length; i++, j++){
  //  this.s1[i] = gndVerts[j];
  //}

 // for(i=this.partCount * PART_MAXVAR, j=0; j< gndVerts.length; i++, j++) {
	//this.allVBO[i] = gndVerts[j];
	//}
  //for(i=this.partCount * PART_MAXVAR + gndVerts.length, j=0; j< this.springParts.length; i++, j++) {
  //  this.allVBO[i] = this.springParts[j];
  //  }
  // Write data from our JavaScript array to graphics systems' buffer object:
  gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);
  // why 'DYNAMIC_DRAW'? Because we change VBO's content with bufferSubData() later
  
  // ---------Set up all attributes for VBO contents:
  //Get the ID# for the a_Position variable in the graphics hardware
  this.a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
  if(this.a_PositionID < 0) {
    console.log('PartSys.init() Failed to get the storage location of a_Position');
    return -1;
  }
  // Tell GLSL to fill the 'a_Position' attribute variable for each shader with
  // values from the buffer object chosen by 'gl.bindBuffer()' command.
  // websearch yields OpenGL version: 
  //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml

 
  // ---------Set up all uniforms we send to the GPU:
  // Get graphics system storage location of each uniform our shaders use:
  // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
  this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if (!this.u_ModelMatrix) { 
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  this.u_runModeID = gl.getUniformLocation(gl.program, 'u_runMode');
  if(!this.u_runModeID) {
  	console.log('PartSys.init() Failed to get u_runMode variable location');
  	return;
  }
  // Set the initial values of all uniforms on GPU: (runMode set by keyboard)
	gl.uniform1i(this.u_runModeID, this.runMode);
}
PartSys.prototype.initFlocking = function(count) { 
//==============================================================================
  console.log('PartSys.initFlocking() stub not finished!');
}
PartSys.prototype.initSpringPair = function() { 
}
PartSys.prototype.initSpringRope = function(count) { 
  //==============================================================================
  
    // Create all state-variables-------------------------------------------------
    this.partCount = count;
    this.s1 =    new Float32Array(this.partCount * PART_MAXVAR);
    this.s2 =    new Float32Array(this.partCount * PART_MAXVAR);
    this.s1dot = new Float32Array(this.partCount * PART_MAXVAR);  
    this.springParts = new Float32Array([0.0, 0.0, 0.0, 1.0,
                                         40.0, 0.0, 0.0,
                                         0.0, 0.0, 0.0,
                                         1.0, 1.0, 1.0,
                                         1.0, 2.0 + 10*Math.random(), 0.0,
                                         30 + 100*Math.random(),
                                         1.0, 0.0, 0.0, 1.0,
                                         0.0, 0.0, 0.0,
                                         0.0, 0.0, 0.0,
                                         1.0, 1.0, 1.0,
                                         1.0, 2.0 + 10*Math.random(), 0.0,
                                         30 + 100*Math.random()]);
    this.isRope = true;
    this.isTor = false;
    this.isFire = false;
          // NOTE: Float32Array objects are zero-filled by default.
    // Create & init all force-causing objects------------------------------------

    var fTmp = new CForcer();       // create a force-causing object, and
  // earth gravity for all particles:
  fTmp.forceType = F_GRAV_E;      // set it to earth gravity, and
  fTmp.targFirst = 0;             // set it to affect ALL particles:
  fTmp.partCount = -1;            // (negative value means ALL particles)
                                  // (and IGNORE all other Cforcer members...)
  this.forceList.push(fTmp);    
    // drag for all particles:
    fTmp = new CForcer();           // create a NEW CForcer object 
                                    // (WARNING! until we do this, fTmp refers to
                                    // the same memory locations as forceList[0]!!!) 
    fTmp.forceType = F_DRAG;        // Viscous Drag
    fTmp.Kdrag = 0.15;              // in Euler solver, scales velocity by 0.85
    fTmp.targFirst = 0;             // apply it to ALL particles:
    fTmp.partCount = -1;            // (negative value means ALL particles)
                                    // (and IGNORE all other Cforcer members...)
    this.forceList.push(fTmp);      // append this 'gravity' force object to 
                                    // the forceList array of force-causing objects.  

    fTmp = new CForcer();           // create a NEW CForcer object 
                                    // (WARNING! until we do this, fTmp refers to
                                    // the same memory locations as forceList[0]!!!) 
    fTmp.forceType = F_WIND;        // Viscous Drag
    this.forceList.push(fTmp);      // append this 'gravity' force object to 
                                    // the forceList array of force-causing objects.  
      var fTmp = new CForcer();
      fTmp.forceType = F_SPRINGSET;// Viscous Drag
      fTmp.K_springDamp = 0.100;
      fTmp.K_spring = 40.5;
      fTmp.K_restLength = 0.05;// apply it to ALL particles:
                                      // (and IGNORE all other Cforcer members...)
      this.forceList.push(fTmp);      // append this 'gravity' force object to 
                                      // the forceList array of force-causing objects.
  //  }    
    // Report:
    console.log("\t\t", this.forceList.length, "CForcer objects:");
    for(i=0; i<this.forceList.length; i++) {
      console.log("CForceList[",i,"]");
      this.forceList[i].printMe();
    }                   
      
    // Create & init all constraint-causing objects-------------------------------
    var cTmp = new CLimit();      // creat constraint-causing object, and
    cTmp.hitType = HIT_BOUNCE_VEL;  // set how particles 'bounce' from its surface,
    cTmp.limitType = LIM_VOL;       // confine particles inside axis-aligned 
                                    // rectangular volume that
    cTmp.targFirst = 0;             // applies to ALL particles; starting at 0 
    cTmp.partCount = -1;            // through all the rest of them.
    cTmp.xMin = -1.0; cTmp.xMax = 1.0;  // box extent:  +/- 1.0 box at origin
    cTmp.yMin = -1.0; cTmp.yMax = 1.0;
    cTmp.zMin = -1.0; cTmp.zMax = 1.0;
    cTmp.Kresti = 1.0;              // bouncyness: coeff. of restitution.
                                    // (and IGNORE all other CLimit members...)
    this.limitList.push(cTmp);      // append this 'box' constraint object to the
                                    // 'limitList' array of constraint-causing objects.
    var cTmp = new CLimit();      // creat constraint-causing object, and
    cTmp.limitType = LIM_ANCHOR;       
    cTmp.zMin = 2;
  
    this.limitList.push(cTmp);      // append this 'box' constraint object to the
                                    // 'limitList' array of constraint-causing objects. 
    // Report:
    console.log("PartSys.initBouncy2D() created PartSys.limitList[] array of ");
    console.log("\t\t", this.limitList.length, "CLimit objects.");
  
    this.INIT_VEL =  0.15 * 60.0;		// initial velocity in meters/sec.
                      // adjust by ++Start, --Start buttons. Original value 
                      // was 0.15 meters per timestep; multiply by 60 to get
                      // meters per second.
    this.drag = 0.985;// units-free air-drag (scales velocity); adjust by d/D keys
    this.grav = 9.832;// gravity's acceleration(meter/sec^2); adjust by g/G keys.
                      // on Earth surface, value is 9.832 meters/sec^2.
    this.resti = 1.0; // units-free 'Coefficient of Restitution' for 
                      // inelastic collisions.  Sets the fraction of momentum 
                      // (0.0 <= resti < 1.0) that remains after a ball 
                      // 'bounces' on a wall or floor, as computed using 
                      // velocity perpendicular to the surface. 
                      // (Recall: momentum==mass*velocity.  If ball mass does 
                      // not change, and the ball bounces off the x==0 wall,
                      // its x velocity xvel will change to -xvel * resti ).    

    //--------------------------init Particle System Controls:
    this.runMode =  3;// Master Control: 0=reset; 1= pause; 2=step; 3=run
    this.solvType = SOLV_EULER;// adjust by s/S keys.
                      // SOLV_EULER (explicit, forward-time
                      // SOLV_OLDGOOD for special-case implicit solver, reverse-time
    this.isFountain = 0;
    this.bounceType = 1;// floor-bounce constraint type:
                    // ==0 for velocity-reversal, as in all previous versions
                    // ==1 for Chapter 3's collision resolution method, which
                    // uses an 'impulse' to cancel any velocity boost caused
                    // by falling below the floor.

  //--------------------------------Create & fill VBO with state var s1 contents:
  // INITIALIZE s1, s2:
  //  NOTE: s1,s2 are a Float32Array objects, zero-filled by default.
  // That's OK for most particle parameters, but these need non-zero defaults:
    // initial position and velocity
    
  
    var j = 0;  // i==particle number; j==array index for i-th particle
    for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
      this.roundRand();       // set this.randX,randY,randZ to random location in 
                              // a 3D unit sphere centered at the origin.
      //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
      // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
      this.s1[j + PART_ZPOS] = 4.5 - i / 2.0;
      this.s1[j + PART_WPOS] = 1.0;      // position 'w' coordinate;
      this.roundRand(); // Now choose random initial velocities too:
      if(i % 2 ==1){
        this.s1[j + PART_YVEL] = 100.0;
      }
      this.s1[j + PART_MASS] =  0.1;      // mass, in kg.
      this.s1[j + PART_DIAM] =  2.0 + 10*Math.random(); // on-screen diameter, in pixels
      this.s1[j + PART_RENDMODE] = 0.0;
      this.s1[j + PART_AGE] = 30 + 100*Math.random();
      //----------------------------
      this.s2.set(this.s1);   // COPY contents of state-vector s1 to s2.
    }
  
    this.shaderLoc = createProgram(gl, this.VSHADER_SOURCE, this.FSHADER_SOURCE);
    if (!this.shaderLoc) {
      console.log(this.constructor.name + 
                  '.init() failed to create shaders on gpu');
      return;
    }
    
    // a) select our shader program:
    gl.useProgram(this.shaderLoc);	
    //		Each call to useProgram() selects a shader program from the GPU memory,
    // but that's all -- it does nothing else!  Any previously used shader program's 
    // connections to attributes and uniforms are now invalid, and thus we must now
    // establish new connections between our shader program's attributes and the VBO
    // we wish to use.  
      
    this.FSIZE = this.s1.BYTES_PER_ELEMENT;  // 'float' size, in bytes.
    // Create a vertex buffer object (VBO) in the graphics hardware: get its ID# 
      this.vboID = gl.createBuffer();
      if (!this.vboID) {
        console.log('PartSys.init() Failed to create the VBO object in the GPU');
        return -1;
      }
    
    
    
    
      //for(i=0, j=0; j< gndVerts.length; i++, j++) {
      //verticesTwo[i] = gndVerts[j];
      //  vtwocount++;	
      //}
      gl.program = this.shaderLoc;  
    
      // "Bind the new buffer object (memory in the graphics system) to target"
      // In other words, specify the usage of one selected buffer object.
      // What's a "Target"? it's the poorly-chosen OpenGL/WebGL name for the 
      // intended use of this buffer's memory; so far, we have just two choices:
      //	== "gl.ARRAY_BUFFER" meaning the buffer object holds actual values we 
      //      need for rendering (positions, colors, normals, etc), or 
      //	== "gl.ELEMENT_ARRAY_BUFFER" meaning the buffer object holds indices 
      // 			into a list of values we need; indices such as object #s, face #s, 
      //			edge vertex #s.
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vboID);
    
      //for(i = this.partCount*PART_MAXVAR, j = 0; 
      //  j < gndVerts.length; i++, j++){
      //  this.s1[i] = gndVerts[j];
      //}
    
     // for(i=this.partCount * PART_MAXVAR, j=0; j< gndVerts.length; i++, j++) {
      //this.allVBO[i] = gndVerts[j];
      //}
      //for(i=this.partCount * PART_MAXVAR + gndVerts.length, j=0; j< this.springParts.length; i++, j++) {
      //  this.allVBO[i] = this.springParts[j];
      //  }
      // Write data from our JavaScript array to graphics systems' buffer object:
      gl.bufferData(gl.ARRAY_BUFFER, this.s1, gl.DYNAMIC_DRAW);
      // why 'DYNAMIC_DRAW'? Because we change VBO's content with bufferSubData() later
      
      // ---------Set up all attributes for VBO contents:
      //Get the ID# for the a_Position variable in the graphics hardware
      this.a_PositionID = gl.getAttribLocation(gl.program, 'a_Position');
      if(this.a_PositionID < 0) {
        console.log('PartSys.init() Failed to get the storage location of a_Position');
        return -1;
      }
      // Tell GLSL to fill the 'a_Position' attribute variable for each shader with
      // values from the buffer object chosen by 'gl.bindBuffer()' command.
      // websearch yields OpenGL version: 
      //		http://www.opengl.org/sdk/docs/man/xhtml/glVertexAttribPointer.xml
    
     
      // ---------Set up all uniforms we send to the GPU:
      // Get graphics system storage location of each uniform our shaders use:
      // (why? see  http://www.opengl.org/wiki/Uniform_(GLSL) )
      this.u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
      if (!this.u_ModelMatrix) { 
        console.log('Failed to get the storage location of u_ModelMatrix');
        return;
      }
    
      this.u_runModeID = gl.getUniformLocation(gl.program, 'u_runMode');
      if(!this.u_runModeID) {
        console.log('PartSys.init() Failed to get u_runMode variable location');
        return;
      }
      // Set the initial values of all uniforms on GPU: (runMode set by keyboard)
      gl.uniform1i(this.u_runModeID, this.runMode);
  }
PartSys.prototype.initSpringCloth = function(xSiz,ySiz) {
//==============================================================================
  console.log('PartSys.initSpringCloth() stub not finished!');
}
PartSys.prototype.initSpringSolid = function() {
//==============================================================================
  console.log('PartSys.initSpringSolid() stub not finished!');
}
PartSys.prototype.initOrbits = function() {
//==============================================================================
  console.log('PartSys.initOrbits() stub not finished!');
}
function makeRectPrism(){
	RectPrismVerts = new Float32Array([
		0.0, 0.0, 0.0, 1.0,			1.0, 0.0, 0.0,		// r
		0.5, 0.0, 0.0, 1.0,     	1.0, 1.0, 0.0,	  // ylw
		0.0, 0.5, 0.0, 1.0,			0.0, 0.0, 0.0,		// blk
	   
		0.5, 0.5, 0.0, 1.0,  1.0, 0.0, 0.0,		// r  					
		0.5, 0.0, 0.0, 1.0,  1.0, 1.0, 0.0,	  // ylw 	
		0.0, 0.5, 0.0, 1.0,  0.0, 0.0, 0.0,		// blk
		//bot-mid rn X
		0.0, 0.0, 0.5, 1.0,			1.0, 0.0, 0.0,		// r
		0.5, 0.0, 0.5, 1.0,     	0.0, 0.0, 0.0,		// blk
		0.0, 0.0, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
	   
		0.5, 0.0, 0.0, 1.0,			0.0, 0.0, 0.0,		// blk
		0.5, 0.0, 0.5, 1.0,     	1.0, 0.0, 0.0,		// r
		0.0, 0.0, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
		// right rn X
		0.5, 0.0, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
		0.5, 0.0, 0.5, 1.0,     	1.0, 0.0, 0.0,		// r
		0.5, 0.5, 0.0, 1.0,			0.0, 0.0, 0.0,		// blk
	
		0.5, 0.5, 0.5, 1.0,			0.0, 0.0, 0.0,		// blk
		0.5, 0.0, 0.5, 1.0,     	1.0, 0.0, 0.0,		// r
		0.5, 0.5, 0.0, 1.0,			1.0, 1.0, 0.0,	  // ylw
		//left rn X
	   0.0, 0.0, 0.5, 1.0,			1.0, 1.0, 1.0,		// w
	   0.0, 0.0, 0.0, 1.0,     	0.0, 0.0, 1.0,	  // b
	   0.0, 0.5, 0.5, 1.0,			0.0, 0.0, 0.0,		// blk
	
	   0.0, 0.5, 0.0, 1.0,			0.0, 0.0, 1.0,	  // b
	   0.0, 0.0, 0.0, 1.0,     	1.0, 1.0, 1.0,		// w
	   0.0, 0.5, 0.5, 1.0,			0.0, 0.0, 0.0,		// blk
	   //bottom rn X
	   0.0, 0.0, 0.5, 1.0,			0.5, 0.5, 0.5,		//g
	   0.5, 0.0, 0.5, 1.0,     	1.0, 1.0, 0.0,	  // y
	   0.0, 0.5, 0.5, 1.0,			0.0, 1.0, 1.0,		// cyan
	  
	   0.5, 0.5, 0.5, 1.0,  0.0, 1.0, 0.0, // g    					
	   0.5, 0.0, 0.5, 1.0,  1.0, 0.0, 1.0, // prpl  	
	   0.0, 0.5, 0.5, 1.0,  0.0, 0.0, 0.0, //blk
	   //top rn X
	   0.0, 0.5, 0.0, 1.0,			1.0, 0.0, 0.0,		// r
	   0.5, 0.5, 0.0, 1.0,     	0.0, 1.0, 0.0,	  // g
	   0.0, 0.5, 0.5, 1.0,			0.0, 0.0, 1.0,		// b
	
	   0.5, 0.5, 0.5, 1.0,			.0, 0.0, 1.0,		// b
	   0.5, 0.5, 0.0, 1.0,     	1.0, 0.0, 0.0,		// r
	   0.0, 0.5, 0.5, 1.0,			 	0.0, 1.0, 0.0,	  // g
	]);
}
PartSys.prototype.applyForces = function(s, fList) { 
//==============================================================================
// Clear the force-accumulator vector for each particle in state-vector 's', 
// then apply each force described in the collection of force-applying objects 
// found in 'fSet'.
// (this function will simplify our too-complicated 'draw()' function)

  // To begin, CLEAR force-accumulators for all particles in state variable 's'
  var j = 0;  // i==particle number; j==array index for i-th particle
  for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
    s[j + PART_X_FTOT] = 0.0;
    s[j + PART_Y_FTOT] = 0.0;
    s[j + PART_Z_FTOT] = 0.0;
  }

  // then find and accumulate all forces applied to particles in state s:
  for(var k = 0; k < fList.length; k++) {  // for every CForcer in fList array,
//    console.log("fList[k].forceType:", fList[k].forceType);
    if(fList[k].forceType <=0) {     //.................Invalid force? SKIP IT!
                        // if forceType is F_NONE, or if forceType was 
      continue;         // negated to (temporarily) disable the CForcer,
      }               
    // ..................................Set up loop for all targeted particles
    // HOW THIS WORKS:
    // Most, but not all CForcer objects apply a force to many particles, and
    // the CForcer members 'targFirst' and 'targCount' tell us which ones:
    // *IF* targCount == 0, the CForcer applies ONLY to particle numbers e1,e2
    //          (e.g. the e1 particle begins at s[fList[k].e1 * PART_MAXVAR])
    // *IF* targCount < 0, apply the CForcer to 'targFirst' and all the rest
    //      of the particles that follow it in the state variable s.
    // *IF* targCount > 0, apply the CForcer to exactly 'targCount' particles,
    //      starting with particle number 'targFirst'
    // Begin by presuming targCount < 0;
    var m = fList[k].targFirst;   // first affected particle # in our state 's'
    var mmax = this.partCount;    // Total number of particles in 's'
                                  // (last particle number we access is mmax-1)
    if(fList[k].targCount==0){    // ! Apply force to e1,e2 particles only!
      m=mmax=0;   // don't let loop run; apply force to e1,e2 particles only.
      }
    else if(fList[k].targCount > 0) {   // ?did CForcer say HOW MANY particles?
      // YES! force applies to 'targCount' particles starting with particle # m:
      var tmp = fList[k].targCount;
      if(tmp < mmax) mmax = tmp;    // (but MAKE SURE mmax doesn't get larger)
      else console.log("\n\n!!PartSys.applyForces() index error!!\n\n");
      }
      //console.log("m:",m,"mmax:",mmax);
      // m and mmax are now correctly initialized; use them!  
    //......................................Apply force specified by forceType 
    switch(fList[k].forceType) {    // what kind of force should we apply?
      case F_MOUSE:     // Spring-like connection to mouse cursor
      var j = 0;  // i==particle number; j==array index for i-th particle
      for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {

       if(isclick){
        this.s2[j + PART_XVEL] = xMclik*4- this.s2[j + PART_XPOS];
        this.s2[j + PART_YVEL] = g_EyeY- this.s2[j + PART_YPOS];
        this.s2[j + PART_ZVEL] = yMclik*2- this.s2[j + PART_ZPOS];
        
       }
      }
        break;
      case F_GRAV_E: 
       if(this.isRope){
        var j = m*PART_MAXVAR;  // state var array index for particle # m
        for(; m<mmax; m++, j+=PART_MAXVAR) { // for every part# from m to mmax-1,
                      // force from gravity == mass * gravConst * downDirection
          s[j + PART_X_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
                                                   fList[k].downDir.elements[0];
          s[j + PART_Y_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
                                                   fList[k].downDir.elements[1];
          s[j + PART_Z_FTOT] += s[j + PART_MASS] * (fList[k].gravConst * 
                                                   fList[k].downDir.elements[2])*(1/10);
        }
      }
       else{
         // Earth-gravity pulls 'downwards' as defined by downDir
        var j = m*PART_MAXVAR;  // state var array index for particle # m
        for(; m<mmax; m++, j+=PART_MAXVAR) { // for every part# from m to mmax-1,
                      // force from gravity == mass * gravConst * downDirection
          s[j + PART_X_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
                                                   fList[k].downDir.elements[0];
          s[j + PART_Y_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
                                                   fList[k].downDir.elements[1];
          s[j + PART_Z_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
                                                   fList[k].downDir.elements[2];
        }
          }
        break;
      case F_GRAV_P:    // planetary gravity between particle # e1 and e2.
        console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                  fList[k].forceType, "NOT YET IMPLEMENTED!!");
       break;
      case F_BUBBLE:    // Constant inward force (bub_force)to a 3D centerpoint 
                        // bub_ctr if particle is > bub_radius away from it.
        console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                  fList[k].forceType, "NOT YET IMPLEMENTED!!");
       break;
      case F_DRAG:      // viscous drag: force = -K_drag * velocity.
        var j = m*PART_MAXVAR;  // state var array index for particle # m
        for(; m<mmax; m++, j+=PART_MAXVAR) { // for every particle# from m to mmax-1,
                      // force from gravity == mass * gravConst * downDirection
          s[j + PART_X_FTOT] -= fList[k].K_drag * s[j + PART_XVEL]; 
          s[j + PART_Y_FTOT] -= fList[k].K_drag * s[j + PART_YVEL];
          s[j + PART_Z_FTOT] -= fList[k].K_drag * s[j + PART_ZVEL];
          }
        break;
      case F_SPRING:

        break;
      case F_SPRINGSET:
        var j = m*PART_MAXVAR;  // state var array index for particle # m
        for(; m<(mmax-1); m++, j+=PART_MAXVAR) { // for every particle# from m to mmax-1,
                      // force from gravity == mass * gravConst * downDirection
          var K = fList[k].K_spring;
          var L = fList[k].K_restLength;
          var D = fList[k].K_springDamp;
          var X = ((this.s1[j + PART_MAXVAR + PART_XPOS] - this.s1[j + PART_XPOS])**2
                           + (this.s1[j + PART_MAXVAR + PART_YPOS] - this.s1[j + PART_YPOS])**2 
                           + (this.s1[j + PART_MAXVAR + PART_ZPOS] - this.s1[j + PART_ZPOS])**2)**(1/2);
          this.s1[j + PART_X_FTOT] +=  (this.s1[j + PART_MAXVAR + PART_XPOS] - this.s1[j + PART_XPOS])
                                       *((K * (X - L))*D);
          this.s1[j + PART_Y_FTOT] +=  (this.s1[j + PART_MAXVAR + PART_YPOS] - this.s1[j + PART_YPOS])
                                       *((K * (X - L))*D); 
          this.s1[j + PART_Z_FTOT] +=  (this.s1[j + PART_MAXVAR + PART_ZPOS] - this.s1[j + PART_ZPOS]) 
                                       *((K * (X - L))*D); 
          this.s1[j + PART_MAXVAR + PART_X_FTOT] -=  (this.s1[j + PART_MAXVAR + PART_XPOS] - this.s1[j + PART_XPOS])
                                       *((K * (X - L))*D);
          this.s1[j + PART_MAXVAR + PART_Y_FTOT] -=  (this.s1[j + PART_MAXVAR + PART_YPOS] - this.s1[j + PART_YPOS])
                                       *((K * (X - L))*D); 
          this.s1[j + PART_MAXVAR + PART_Z_FTOT] -=  (this.s1[j + PART_MAXVAR + PART_ZPOS] - this.s1[j + PART_ZPOS]) 
                                       *((K * (X - L))*D);       
          
        }
        break;
      case F_WIND:
        var j = 0;  // i==particle number; j==array index for i-th particle
        if(this.isTor){

        for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
  
          if (s[j + PART_YPOS] > 0){
            s[j + PART_YVEL] -= 2;
          }
          else{
            s[j + PART_YVEL] += 2;
      
          }
          if (s[j + PART_XPOS] > 0){
            s[j + PART_XVEL] -= 2;
          }
          else{
            s[j + PART_XVEL] += 2;
      
          }
          }}
        if(isWind){
          var j = PART_MAXVAR;  // START on second end on second to last i==particle number; j==array index for i-th particle
          for(var i = 1; i < this.partCount-1; i += 1, j+= PART_MAXVAR) {
            if( s[j + PART_XPOS] <0.9){
        
            s[j + PART_X_FTOT] += .1;
            }
            if( s[j + PART_YPOS] <0.9){
            s[j + PART_Y_FTOT] += .1;
            }
            if( s[j + PART_ZPOS] <0.25){
            s[j + PART_Z_FTOT] += .1;
            }
          }
        }
        console.log("PartSys.applyForces(), fList[",k,"].forceType:", 
                                  fList[k].forceType, "NOT YET IMPLEMENTED!!");
        break;
      default:
        console.log("!!!ApplyForces() fList[",k,"] invalid forceType:", fList[k].forceType);
        break;
    } // switch(fList[k].forceType)
  } // for(k=0...)
}

PartSys.prototype.dotFinder = function(dest, src) {
//==============================================================================
// fill the already-existing 'dest' variable (a float32array) with the 
// time-derivative of given state 'src'.  

  var invMass;  // inverse mass
  var j = 0;  // i==particle number; j==array index for i-th particle
  for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
    dest[j + PART_XPOS] = src[j + PART_XVEL];   // position derivative = velocity
    dest[j + PART_YPOS] = src[j + PART_YVEL];
    dest[j + PART_ZPOS] = src[j + PART_ZVEL];
    dest[j + PART_WPOS] = 0.0;                  // presume 'w' fixed at 1.0
    // Use 'src' current force-accumulator's values (set by PartSys.applyForces())
    // to find acceleration.  As multiply is FAR faster than divide, do this:
    invMass = 1.0 / src[j + PART_MASS];   // F=ma, so a = F/m, or a = F(1/m);
    dest[j + PART_XVEL] = src[j + PART_X_FTOT] * invMass; 
    dest[j + PART_YVEL] = src[j + PART_Y_FTOT] * invMass;
    dest[j + PART_ZVEL] = src[j + PART_Z_FTOT] * invMass;
    dest[j + PART_X_FTOT] = 0.0;  // we don't know how force changes with time;
    dest[j + PART_Y_FTOT] = 0.0;  // presume it stays constant during timestep.
    dest[j + PART_Z_FTOT] = 0.0;
    dest[j + PART_R] = 0.0;       // presume color doesn't change with time.
    dest[j + PART_G] = 0.0;
    dest[j + PART_B] = 0.0;
    dest[j + PART_MASS] = 0.0;    // presume mass doesn't change with time.
    dest[j + PART_DIAM] = 0.0;    // presume these don't change either...   
    dest[j + PART_RENDMODE] = 0.0;
    dest[j + PART_AGE] = 0.0;
    }
}

PartSys.prototype.dot2Finder = function(dest, src) {
  //==============================================================================
  // fill the already-existing 'dest' variable (a float32array) with the 
  // time-derivative of given state 'src'.  
  
    var invMass;  // inverse mass
    var j = 0;  // i==particle number; j==array index for i-th particle
    for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
      dest[j + PART_XPOS] = src[j + PART_X_FTOT]/src[j + PART_MASS];    // position derivative = velocity
      dest[j + PART_YPOS] = src[j + PART_Y_FTOT]/src[j + PART_MASS];
      dest[j + PART_ZPOS] = src[j + PART_Z_FTOT]/src[j + PART_MASS];
      dest[j + PART_WPOS] = 0.0;                  // presume 'w' fixed at 1.0
      // Use 'src' current force-accumulator's values (set by PartSys.applyForces())
      // to find acceleration.  As multiply is FAR faster than divide, do this:
      invMass = 1.0 / src[j + PART_MASS];   // F=ma, so a = F/m, or a = F(1/m);
      dest[j + PART_XVEL] = 0;
      dest[j + PART_YVEL] = 0;
      dest[j + PART_ZVEL] = 0;
      dest[j + PART_X_FTOT] = 0.0;  // we don't know how force changes with time;
      dest[j + PART_Y_FTOT] = 0.0;  // presume it stays constant during timestep.
      dest[j + PART_Z_FTOT] = 0.0;
      dest[j + PART_R] = 0.0;       // presume color doesn't change with time.
      dest[j + PART_G] = 0.0;
      dest[j + PART_B] = 0.0;
      dest[j + PART_MASS] = 0.0;    // presume mass doesn't change with time.
      dest[j + PART_DIAM] = 0.0;    // presume these don't change either...   
      dest[j + PART_RENDMODE] = 0.0;
      dest[j + PART_AGE] = 0.0;
      }
  }

PartSys.prototype.render = function(g_ModelMat) {
    // Create a local version of our model matrix in JavaScript 

    //var modelMatrix = new Matrix4();

//==============================================================================
// Draw the contents of state-vector 's' on-screen. To do this:
//  a) transfer its contents to the already-existing VBO in the GPU using the
//      WebGL call 'gl.bufferSubData()', then 
//  b) set all the 'uniform' values needed by our shaders,
//  c) draw VBO contents using gl.drawArray().

  // CHANGE our VBO's contents:      
      gl.vertexAttribPointer(this.a_PositionID, 
            4,  // # of values in this attrib (1,2,3,4) 
            gl.FLOAT, // data type (usually gl.FLOAT)
            false,    // use integer normalizing? (usually false)
            PART_MAXVAR*this.FSIZE,  // Stride: #bytes from 1st stored value to next one
            PART_XPOS * this.FSIZE); // Offset; #bytes from start of buffer to 
                      // 1st stored attrib value we will actually use.
    // Enable this assignment of the bound buffer to the a_Position variable:
    gl.enableVertexAttribArray(this.a_PositionID);
  gl.bufferSubData( 
          gl.ARRAY_BUFFER,  // specify the 'binding target': either
                  //    gl.ARRAY_BUFFER (VBO holding sets of vertex attribs)
                  // or gl.ELEMENT_ARRAY_BUFFER (VBO holding vertex-index values)
          0,      // offset: # of bytes to skip at the start of the VBO before 
                    // we begin data replacement.
          this.s1); // Float32Array data source.
  

    
	gl.uniform1i(this.u_runModeID, this.runMode);	// run/step/pause the particle system 
  //g_ModelMat.translate(4,0,0);

  gl.uniformMatrix4fv(this.u_ModelMatrix, false, dhoopModelMatrix.elements);
  // Draw our VBO's contents:
  if(this.isRope && isWind){
    gl.drawArrays(gl.TRIANGLE_FAN,         
      0,                  
      this.partCount);  
  }
  else{
      gl.drawArrays(gl.POINTS,         
    0,                  
    this.partCount);  
      }
  // Draw our VBO's new contents:
    // draw this many vertices.
  }


 PartSys.prototype.solver = function() {
//==============================================================================
// Find next state s2 from current state s1 (and perhaps some related states
// such as s1dot, sM, sMdot, etc.) by the numerical integration method chosen
// by PartSys.solvType.
this.s0 =new Float32Array(this.partCount * PART_MAXVAR);
this.s0dot = new Float32Array(this.partCount * PART_MAXVAR);
this.s1dot2 = new Float32Array(this.partCount * PART_MAXVAR); 
this.sMdot = new Float32Array(this.partCount * PART_MAXVAR);  
this.sM = new Float32Array(this.partCount * PART_MAXVAR);  
this.s3 = new Float32Array(this.partCount * PART_MAXVAR);  
this.s2dot = new Float32Array(this.partCount * PART_MAXVAR); 
		switch(this.solvType)
		{
		  case SOLV_EULER://--------------------------------------------------------
			// EXPLICIT or 'forward time' solver; Euler Method: s2 = s1 + h*s1dot
      for(var n = 0; n < this.s1.length; n++) { // for all elements in s1,s2,s1dot;

        this.s2[n] = this.s1[n] + this.s1dot[n] * (g_timeStep * 0.001);

        }

  
/* // OLD 'BAD' solver never stops bouncing:
			// Compute new position from current position, current velocity, & timestep
      var j = 0;  // i==particle number; j==array index for i-th particle
      for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
    			this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
    			this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001); 
    			this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001); 
    			    			// -- apply acceleration due to gravity to current velocity:
    			// 					 s2[PART_YVEL] -= (accel. due to gravity)*(timestep in seconds) 
    			//									 -= (9.832 meters/sec^2) * (g_timeStep/1000.0);
    			this.s2[j + PART_YVEL] -= this.grav*(g_timeStep*0.001);
    			// -- apply drag: attenuate current velocity:
    			this.s2[j + PART_XVEL] *= this.drag;
    			this.s2[j + PART_YVEL] *= this.drag; 
    			this.s2[j + PART_ZVEL] *= this.drag; 
    	    }
*/
		  break;
		case SOLV_OLDGOOD://-------------------------------------------------------------------
			// IMPLICIT or 'reverse time' solver, as found in bouncyBall04.goodMKS;
			// This category of solver is often better, more stable, but lossy.
			// -- apply acceleration due to gravity to current velocity:
			//				  s2[PART_YVEL] -= (accel. due to gravity)*(g_timestep in seconds) 
			//                  -= (9.832 meters/sec^2) * (g_timeStep/1000.0);
      var j = 0;  // i==particle number; j==array index for i-th particle
      for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {

       if(isclick){
        this.s2[j + PART_XVEL] = xMclik*4- this.s2[j + PART_XPOS];
        this.s2[j + PART_YVEL] = g_EyeY- this.s2[j + PART_YPOS];
        this.s2[j + PART_ZVEL] = yMclik*2- this.s2[j + PART_ZPOS];
        
       }
       else{
        this.s2[j + PART_ZVEL] -= this.grav*(g_timeStep*0.001);
       }
  			// -- apply drag: attenuate current velocity:
  			this.s2[j + PART_XVEL] *= this.drag;
  			this.s2[j + PART_YVEL] *= this.drag;
  			this.s2[j + PART_ZVEL] *= this.drag;


  			// -- move our particle using current velocity:
  			// CAREFUL! must convert g_timeStep from milliseconds to seconds!
  			this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
  			this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001); 
  			this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001); 
  		}
      
      var j = 0;  // i==particle number; j==array index for i-th particle
      for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
        if(this.isTor){
        if (this.s2[j + PART_YPOS] > 0){
          this.s2[j + PART_YVEL] -= 2;
        }
        else{
          this.s2[j + PART_YVEL] += 2;
    
        }
        if (this.s2[j + PART_XPOS] > 0){
          this.s2[j + PART_XVEL] -= 2;
        }
        else{
          this.s2[j + PART_XVEL] += 2;
    
        }
      }

  this.s2[j + PART_ZVEL] -= this.grav*(g_timeStep*0.001);

  			// -- apply drag: attenuate current velocity:
  			this.s2[j + PART_XVEL] *= this.drag;
  			this.s2[j + PART_YVEL] *= this.drag;
  			this.s2[j + PART_ZVEL] *= this.drag;
        

  			// -- move our particle using current velocity:
  			// CAREFUL! must convert g_timeStep from milliseconds to seconds!
  			this.s2[j + PART_XPOS] += this.s2[j + PART_XVEL] * (g_timeStep * 0.001);
  			this.s2[j + PART_YPOS] += this.s2[j + PART_YVEL] * (g_timeStep * 0.001); 
  			this.s2[j + PART_ZPOS] += this.s2[j + PART_ZVEL] * (g_timeStep * 0.001); 
  		}
			// What's the result of this rearrangement?
			//	IT WORKS BEAUTIFULLY! much more stable much more often...
		  break;
    case SOLV_MIDPOINT:         

    for (var n = 0; n < this.sM.length; n++) {   // for all elements in s1,s2,s1dot;
      this.sM[n] = this.s1[n] + (g_timeStep * 0.001) / 2 * this.s1dot[n];
    }
    this.dotFinder(this.sMdot, this.sM);

    for (var n = 0; n < this.s2.length; n++) {   // for all elements in s1,s2,s1dot;
      this.s2[n] = this.s1[n] + (g_timeStep * 0.001) * this.sMdot[n];
    }
      break;
    case SOLV_ADAMS_BASH:       
//fix before dinner fiddle with s0dot no then 11 office hour fri
    break;
    case SOLV_RUNGEKUTTA:       // Arbitrary degree, set by 'solvDegree'
      console.log('NOT YET IMPLEMENTED: this.solvType==' + this.solvType);
      break;
    case SOLV_BACK_EULER:       // 'Backwind' or Implicit Euler
    for(var n = 0; n < this.s2.length; n++) { // for all elements in s1,s2,s1dot;

      this.s2[n] = this.s1[n] + this.s1dot[n] * (g_timeStep * 0.001);

      }
      this.dotFinder(this.s2dot, this.s2);
      for(var n = 0; n < this.s3.length; n++) { // for all elements in s1,s2,s1dot;

        this.s3[n] = this.s2[n] - this.s2dot[n] * (g_timeStep * 0.001);
        }

        for (var n = 0; n < this.s2.length; n++) { // for all elements in s1,s2,s1dot;
          this.s2[n] = this.s2[n] + (this.s1[n] - this.s3[n])/2;
        }

       break;
    case  SOLV_BACK_MIDPT:      // 'Backwind' or Implicit Midpoint
    for (var n = 0; n < this.sM.length; n++) {   // for all elements in s1,s2,s1dot;
      this.sM[n] = this.s1[n] + ((g_timeStep * 0.001) / 2) * this.s1dot[n];
    }
    this.dotFinder(this.sMdot, this.sM);
    for (var n = 0; n < this.s2.length; n++) {   // for all elements in s1,s2,s1dot;
      this.s2[n] = this.s1[n] + (g_timeStep * 0.001) * this.sMdot[n];
    } 
    this.dotFinder(this.s2dot, this.s2);
    for (var n = 0; n < this.sM.length; n++) {
      this.sM[n] = this.s2[n] - (g_timeStep * 0.001)/2 * this.s2dot[n];
    }
    this.dotFinder(this.sMdot, this.sM);
    for (var n = 0; n < this.s3.length; n++) { // for all elements in s1,s2,s1dot;
      this.s3[n] = this.s2[n] - this.sMdot[n] * (g_timeStep * 0.001); 
    }
    for (var n = 0; n < this.s2.length; n++) { // for all elements in s1,s2,s1dot;
      this.s2[n] = this.s2[n] - (this.s3[n] - this.s1[n])/2;
    }
      break;
    case SOLV_BACK_ADBASH:      // 'Backwind' or Implicit Adams-Bashforth
      console.log('NOT YET IMPLEMENTED: this.solvType==' + this.solvType);
      break;
    case SOLV_VERLET:          // Verlet semi-implicit integrator;
    if(this.isRope){
      this.dot2Finder(this.s1dot2, this.s1);
      for (var n = 0; n < this.s2.length; n++) {       // for all elements in s1,s2,s1dot;
        this.s2[n] = 2 * this.s1[n] - this.s0[n] + this.s1dot2[n] * (g_timeStep * 0.001) ** 2;
      }}
      break;
    case SOLV_VEL_VERLET:      
      for (var n = 0; n < this.s2.length; n++) {
        if(this.isRope){
        this.s2[n*PART_MAXVAR + PART_XPOS] = this.s1[n*PART_MAXVAR + PART_XPOS] 
                                           + this.s1[n*PART_MAXVAR + PART_XVEL] * (g_timeStep *0.001) 
                                           + (this.s1[n*PART_MAXVAR + PART_X_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) * (((g_timeStep *0.001)**2)/2);

        this.s2[n*PART_MAXVAR + PART_YPOS] = this.s1[n*PART_MAXVAR + PART_YPOS] 
                                           + this.s1[n*PART_MAXVAR + PART_YVEL] * (g_timeStep *0.001) 
                                           + (this.s1[n*PART_MAXVAR + PART_Y_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) * (((g_timeStep *0.001)**2)/2);

        this.s2[n*PART_MAXVAR + PART_ZPOS] = this.s1[n*PART_MAXVAR + PART_ZPOS] 
                                           + this.s1[n*PART_MAXVAR + PART_ZVEL] * (g_timeStep *0.001) 
                                           + (this.s1[n*PART_MAXVAR + PART_Z_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) * (((g_timeStep *0.001)**2)/2);
        
        this.applyForces(this.s2, this.forceList);
        
        this.s2[n*PART_MAXVAR + PART_XVEL] = this.s1[n*PART_MAXVAR + PART_XVEL] 
                                           + (this.s2[n*PART_MAXVAR + PART_X_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) 
                                           + (this.s1[n*PART_MAXVAR + PART_X_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) * ((g_timeStep *0.001)/2);

        this.s2[n*PART_MAXVAR + PART_YVEL] = this.s1[n*PART_MAXVAR + PART_YVEL] 
                                           + (this.s2[n*PART_MAXVAR + PART_Y_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) 
                                           + (this.s1[n*PART_MAXVAR + PART_Y_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) * ((g_timeStep *0.001)/2);

        this.s2[n*PART_MAXVAR + PART_ZVEL] = this.s1[n*PART_MAXVAR + PART_ZVEL] 
                                           + (this.s2[n*PART_MAXVAR + PART_Z_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) 
                                           + (this.s1[n*PART_MAXVAR + PART_Z_FTOT]/this.s1[n*PART_MAXVAR + PART_MASS]) * ((g_timeStep *0.001)/2);
        
      }}
      break;
    case SOLV_LEAPFROG:        // 'Leapfrog' integrator
      console.log('NOT YET IMPLEMENTED: this.solvType==' + this.solvType);
      break;
    default:
			console.log('?!?! unknown solver: this.solvType==' + this.solvType);
			break;
		}
		return;
}

PartSys.prototype.doConstraints = function(sNow, sNext, cList) {
//==============================================================================
// apply all Climit constraint-causing objects in the cList array to the 
// particles/movements between current state sNow and future state sNext.

// 'bounce' our ball off floor & walls at +/- 0.9,+/-0.9, +/-0.9
// where this.bounceType selects constraint type:
// ==0 for simple velocity-reversal, as in all previous versions
// ==1 for textbook's collision resolution method, which uses an 'impulse' 
//          to cancel any velocity boost caused by falling below the floor.
//   

if(this.isRope){
  for(var k = 0; k < cList.length; k++) {  // for every CLimit in cList array,
//    console.log("cList[k].limitType:", cList[k].limitType);
    if(cList[k].limitType <=0) {     //.................Invalid limit? SKIP IT!
                        // if limitType is LIM_NONE or if limitType was
      continue;         // negated to (temporarily) disable the CLimit object,
      }                 // skip this k-th object in the cList[] array.
    // ..................................Set up loop for all targeted particles
    // HOW THIS WORKS:
    // Most, but not all CLimit objects apply constraint to many particles, and
    // the CLimit members 'targFirst' and 'targCount' tell us which ones:
    // *IF* targCount == 0, the CLimit applies ONLY to particle numbers e1,e2
    //          (e.g. the e1 particle begins at sNow[fList[k].e1 * PART_MAXVAR])
    // *IF* targCount < 0, apply the CLimit to 'targFirst' and all the rest
    //      of the particles that follow it in the state variables sNow, sNext.
    // *IF* targCount > 0, apply the CForcer to exactly 'targCount' particles,
    //      starting with particle number 'targFirst'
    // Begin by presuming targCount < 0;
    var m = cList[k].targFirst;    // first targed particle # in the state vars
    var mmax = this.partCount;    // total number of particles in the state vars
                                  // (last particle number we access is mmax-1)
    if(cList[k].targCount==0){    // ! Apply CLimit to e1,e2 particles only!
      m=mmax=0;   // don't let loop run; apply CLimit to e1,e2 particles only.
      }
    else if(cList[k].targCount > 0) {   // ?did CLimit say HOW MANY particles?
      // YES! limit applies to 'targCount' particles starting with particle # m:
      var tmp = cList[k].targCount;
      if(tmp < mmax) mmax = tmp; // (but MAKE SURE mmax doesn't get larger)
      else console.log("\n\n!!PartSys.doConstraints() index error!!\n\n");
      }
      //console.log("m:",m,"mmax:",mmax);
      // m and mmax are now correctly initialized; use them!  
    //......................................Apply limit specified by limitType 
    switch(cList[k].limitType) {    // what kind of limit should we apply?
      case LIM_VOL:     // The axis-aligned rectangular volume specified by
                        // cList[k].xMin,xMax,yMin,yMax,zMin,zMax keeps
                        // particles INSIDE if xMin<xMax, yMin<yMax, zMin<zMax
                        //      and OUTSIDE if xMin>xMax, yMin>yMax, zMin>xMax.
        var j = m*PART_MAXVAR;  // state var array index for particle # m

//        for(; m<mmax; m++, j+=PART_MAXVAR) { // for every part# from m to mmax-1,
//          sNext[j + PART_X_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
//                                                   fList[k].downDir.elements[0];
//          sNext[j + PART_Y_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
//                                                   fList[k].downDir.elements[1];
//          sNext[j + PART_Z_FTOT] += s[j + PART_MASS] * fList[k].gravConst * 
//                                                   fList[k].downDir.elements[2];
//          }
        break;
      case LIM_WALL:    // 2-sided wall: rectangular, axis-aligned, flat/2D,
                        // zero thickness, any desired size & position
        break;
      case LIM_DISC:    // 2-sided ellipsoidal wall, axis-aligned, flat/2D,
                        // zero thickness, any desired size & position
        break;
      case LIM_BOX:
        break;
      case LIM_MAT_WALL:
        break;
      case LIM_ANCHOR:
        this.s2[PART_XPOS] = 0;
        this.s2[PART_YPOS] = 0;
        //     this.s2[j +PART_ZPOS] = cList[k].zMin;
        this.s2[PART_ZPOS] = cList[k].zMin;
        break;
      case LIM_MAT_:         
      default:
        console.log("!!!doConstraints() cList[",k,"] invalid limitType:", cList[k].limitType);
        break;
    } // switch(cList[k].limitType)
  } // for(k=0...)
}  

	if(this.bounceType==0) { //------------------------------------------------
    var j = 0;  // i==particle number; j==array index for i-th particle
    for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
  		// simple velocity-reversal: 
  		if(      this.s2[j + PART_XPOS] < -0.9 && this.s2[j + PART_XVEL] < 0.0) { 
  		  // bounce on left (-X) wall
  		   this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; 
  		}
  		else if( this.s2[j + PART_XPOS] >  0.9 && this.s2[j + PART_XVEL] > 0.0) {		
  		  // bounce on right (+X) wall
  			 this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];
  		} //---------------------------
  		if(      this.s2[j + PART_YPOS] < -0.9 && this.s2[j + PART_YVEL] < 0.0) {
  			// bounce on floor (-Y)
  			 this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
  		}
  		else if( this.s2[j + PART_YPOS] >  0.9 && this.s2[j + PART_YVEL] > 0.0) {		
  		  // bounce on ceiling (+Y)
  			 this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];
  		} //---------------------------
  		if(      this.s2[j + PART_ZPOS] < 0.0 && this.s2[j + PART_ZVEL] < 0.0) {
  			// bounce on near wall (-Z)
  			 this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
  		}
  		else if( this.s2[j + PART_ZPOS] >  1.9 && this.s2[j + PART_ZVEL] > 0.0) {		
  		  // bounce on far wall (+Z)
  			 this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL];
  			}	
  	//--------------------------
    // The above constraints change ONLY the velocity; nothing explicitly
    // forces the bouncy-ball to stay within the walls. If we begin with a
    // bouncy-ball on floor with zero velocity, gravity will cause it to 'fall' 
    // through the floor during the next timestep.  At the end of that timestep
    // our velocity-only constraint will scale velocity by -this.resti, but its
    // position is still below the floor!  Worse, the resti-weakened upward 
    // velocity will get cancelled by the new downward velocity added by gravity 
    // during the NEXT time-step. This gives the ball a net downwards velocity 
    // again, which again gets multiplied by -this.resti to make a slight upwards
    // velocity, but with the ball even further below the floor. As this cycle
    // repeats, the ball slowly sinks further and further downwards.
    // THUS the floor needs this position-enforcing constraint as well:
      if(      this.s2[j + PART_YPOS] < -0.9) this.s2[j + PART_YPOS] = -0.9;
      else if( this.s2[j + PART_YPOS] >  0.9) this.s2[j + PART_YPOS] =  0.9; // ceiling
      if(      this.s2[j + PART_XPOS] < -0.9) this.s2[j + PART_XPOS] = -0.9; // left wall
      else if( this.s2[j + PART_XPOS] >  0.9) this.s2[j + PART_XPOS] =  0.9; // right wall
      if(      this.s2[j + PART_ZPOS] < 0.0) this.s2[j + PART_ZPOS] = 0.0; // near wall
      else if( this.s2[j + PART_ZPOS] >  1.9) this.s2[j + PART_ZPOS] =  1.9; // far wall
    
    
		// Our simple 'bouncy-ball' particle system needs this position-limiting
		// constraint ONLY for the floor and not the walls, as no forces exist that
		// could 'push' a zero-velocity particle against the wall. But suppose we
		// have a 'blowing wind' force that pushes particles left or right? Any
		// particle that comes to rest against our left or right wall could be
		// slowly 'pushed' through that wall as well -- THUS we need position-limiting
		// constraints for ALL the walls:
    } // end of for-loop thru all particles
	} // end of 'if' for bounceType==0
	else if (this.bounceType==1) { 
    if(this.isRope){
      var j = 0; 
      for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
        if( this.s2[j + PART_XPOS] < -0.9) {// && this.s2[j + PART_XVEL] < 0.0 ) {
          // collision!
            this.s2[j + PART_XPOS] = -0.9;// 1) resolve contact: put particle at wall.
            this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];  // 2a) undo velocity change:
            this.s2[j + PART_XVEL] *= this.drag;	            // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE!
            // need a velocity-sign test here that ensures the 'bounce' step will 
            // always send the ball outwards, away from its wall or floor collision. 
            if( this.s2[j + PART_XVEL] < 0.0) 
                this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
            else 
                this.s2[j + PART_XVEL] =  this.resti * this.s2[j + PART_XVEL]; // sign changed-- don't need another.
          }
        else if( this.s2[j + PART_XPOS] >  0.9) { // && this.s2[j + PART_XVEL] > 0.0) {	
          // collision!
            this.s2[j + PART_XPOS] = 0.9; // 1) resolve contact: put particle at wall.
            this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];	// 2a) undo velocity change:
            this.s2[j + PART_XVEL] *= this.drag;			        // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE! 
            // need a velocity-sign test here that ensures the 'bounce' step will 
            // always send the ball outwards, away from its wall or floor collision. 
            if(this.s2[j + PART_XVEL] > 0.0) 
                this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
            else 
                this.s2[j + PART_XVEL] =  this.resti * this.s2[j + PART_XVEL];	// sign changed-- don't need another.
          }
          if( this.s2[j + PART_YPOS] < -0.9) { // && this.s2[j + PART_YVEL] < 0.0) {		
            // collision! floor...  
              this.s2[j + PART_YPOS] = -0.9;// 1) resolve contact: put particle at wall.
              this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
              this.s2[j + PART_YVEL] *= this.drag;		          // 2b) apply drag:	
              // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
              // ATTENTION! VERY SUBTLE PROBLEM HERE!
              // need a velocity-sign test here that ensures the 'bounce' step will 
              // always send the ball outwards, away from its wall or floor collision.
              if(this.s2[j + PART_YVEL] < 0.0) 
                  this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
              else 
                  this.s2[j + PART_YVEL] =  this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
            }
            //--------  ceiling (+Y) wall  ------------------------------------------
            else if( this.s2[j + PART_YPOS] > 0.9 ) { // && this.s2[j + PART_YVEL] > 0.0) {
                 // collision! ceiling...
              this.s2[j + PART_YPOS] = 0.9;// 1) resolve contact: put particle at wall.
              this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
              this.s2[j + PART_YVEL] *= this.drag;			        // 2b) apply drag:
              // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
              // ATTENTION! VERY SUBTLE PROBLEM HERE!
              // need a velocity-sign test here that ensures the 'bounce' step will 
              // always send the ball outwards, away from its wall or floor collision.
              if(this.s2[j + PART_YVEL] > 0.0) 
                  this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
              else 
                  this.s2[j + PART_YVEL] =  this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
            }
        if( this.s2[j + PART_ZPOS] < 0.0 ) { // && this.s2[j + PART_ZVEL] < 0.0 ) {
          // collision! 
            this.s2[j + PART_ZPOS] = 0.0;// 1) resolve contact: put particle at wall.
            this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
            this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
            // need a velocity-sign test here that ensures the 'bounce' step will 
            // always send the ball outwards, away from its wall or floor collision. 
            if( this.s2[j + PART_ZVEL] < 0.0) 
                this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
            else 
                this.s2[j + PART_ZVEL] =  this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
          } 
          else if( this.s2[j + PART_ZPOS] >  1.9) { // && this.s2[j + PART_ZVEL] > 0.0) {	
            // collision! 
              this.s2[j + PART_ZPOS] = 1.9; // 1) resolve contact: put particle at wall.
              this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
              this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
              // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
              // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
              // need a velocity-sign test here that ensures the 'bounce' step will 
              // always send the ball outwards, away from its wall or floor collision.   			
              if(this.s2[j + PART_ZVEL] > 0.0) 
                  this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
              else 
                  this.s2[j + PART_ZVEL] =  this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
            }
          //--------  far (+Z) wall  ---------------------------------------------- 

 
      }
      }
  else{
    var j = 0;  // i==particle number; j==array index for i-th particle
    for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
      //--------  left (-X) wall  ----------
  		if( this.s2[j + PART_XPOS] < -0.9) {// && this.s2[j + PART_XVEL] < 0.0 ) {
  		// collision!
  			this.s2[j + PART_XPOS] = -0.9;// 1) resolve contact: put particle at wall.
			  this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];  // 2a) undo velocity change:
  			this.s2[j + PART_XVEL] *= this.drag;	            // 2b) apply drag:
  		  // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			// ATTENTION! VERY SUBTLE PROBLEM HERE!
  			// need a velocity-sign test here that ensures the 'bounce' step will 
  			// always send the ball outwards, away from its wall or floor collision. 
  			if( this.s2[j + PART_XVEL] < 0.0) 
  			    this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
  			else 
  			    this.s2[j + PART_XVEL] =  this.resti * this.s2[j + PART_XVEL]; // sign changed-- don't need another.
  		}
  		//--------  right (+X) wall  --------------------------------------------
  		else if( this.s2[j + PART_XPOS] >  0.9) { // && this.s2[j + PART_XVEL] > 0.0) {	
  		// collision!
  			this.s2[j + PART_XPOS] = 0.9; // 1) resolve contact: put particle at wall.
  			this.s2[j + PART_XVEL] = this.s1[j + PART_XVEL];	// 2a) undo velocity change:
  			this.s2[j + PART_XVEL] *= this.drag;			        // 2b) apply drag:
  		  // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			// ATTENTION! VERY SUBTLE PROBLEM HERE! 
  			// need a velocity-sign test here that ensures the 'bounce' step will 
  			// always send the ball outwards, away from its wall or floor collision. 
  			if(this.s2[j + PART_XVEL] > 0.0) 
  			    this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL]; // need sign change--bounce!
  			else 
  			    this.s2[j + PART_XVEL] =  this.resti * this.s2[j + PART_XVEL];	// sign changed-- don't need another.
  		}

      //--------  floor (-Y) wall  --------------------------------------------  		
  		if( this.s2[j + PART_YPOS] < -0.9) { // && this.s2[j + PART_YVEL] < 0.0) {		
  		// collision! floor...  
  			this.s2[j + PART_YPOS] = -0.9;// 1) resolve contact: put particle at wall.
  			this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
  			this.s2[j + PART_YVEL] *= this.drag;		          // 2b) apply drag:	
  		  // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			// ATTENTION! VERY SUBTLE PROBLEM HERE!
  			// need a velocity-sign test here that ensures the 'bounce' step will 
  			// always send the ball outwards, away from its wall or floor collision.
  			if(this.s2[j + PART_YVEL] < 0.0) 
  			    this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
  			else 
  			    this.s2[j + PART_YVEL] =  this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
  		}
  		//--------  ceiling (+Y) wall  ------------------------------------------
  		else if( this.s2[j + PART_YPOS] > 0.9 ) { // && this.s2[j + PART_YVEL] > 0.0) {
  		 		// collision! ceiling...
  			this.s2[j + PART_YPOS] = 0.9;// 1) resolve contact: put particle at wall.
  			this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
  			this.s2[j + PART_YVEL] *= this.drag;			        // 2b) apply drag:
  		  // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			// ATTENTION! VERY SUBTLE PROBLEM HERE!
  			// need a velocity-sign test here that ensures the 'bounce' step will 
  			// always send the ball outwards, away from its wall or floor collision.
  			if(this.s2[j + PART_YVEL] > 0.0) 
  			    this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
  			else 
  			    this.s2[j + PART_YVEL] =  this.resti * this.s2[j + PART_YVEL];	// sign changed-- don't need another.
  		}
  		//--------  near (-Z) wall  --------------------------------------------- 
  		if( this.s2[j + PART_ZPOS] < 0.0 ) { // && this.s2[j + PART_ZVEL] < 0.0 ) {
  		// collision! 
  			this.s2[j + PART_ZPOS] = 0.0;// 1) resolve contact: put particle at wall.
  			this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
  			this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
  		  // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			// ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
  			// need a velocity-sign test here that ensures the 'bounce' step will 
  			// always send the ball outwards, away from its wall or floor collision. 
  			if( this.s2[j + PART_ZVEL] < 0.0) 
  			    this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
  			else 
  			    this.s2[j + PART_ZVEL] =  this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
  		}
  		//--------  far (+Z) wall  ---------------------------------------------- 
  		else if( this.s2[j + PART_ZPOS] >  1.9) { // && this.s2[j + PART_ZVEL] > 0.0) {	
  		// collision! 
  			this.s2[j + PART_ZPOS] = 1.9; // 1) resolve contact: put particle at wall.
  			this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
  			this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
  		  // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
  			// ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
  			// need a velocity-sign test here that ensures the 'bounce' step will 
  			// always send the ball outwards, away from its wall or floor collision.   			
  			if(this.s2[j + PART_ZVEL] > 0.0) 
  			    this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; // need sign change--bounce!
  			else 
  			    this.s2[j + PART_ZVEL] =  this.resti * this.s2[j + PART_ZVEL];	// sign changed-- don't need another.
  		} // end of (+Z) wall constraint
       if(this.isFire){ 
       if((this.s2[j + PART_ZPOS] < 0.25) && this.s2[j + PART_XPOS] > 0.75 && this.s2[j + PART_YPOS] < 0.15) { // && this.s2[j + PART_ZVEL] < 0.0 ) {
        // collision! 
         if((0.25 - this.s2[j + PART_ZPOS]) < this.s2[j + PART_XPOS] - 0.75){
          this.s2[j + PART_ZPOS] = 0.25;// 1) resolve contact: put particle at wall.
          this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
          this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
          
          // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
          // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
          // need a velocity-sign test here that ensures the 'bounce' step will 
          // always send the ball outwards, away from its wall or floor collision. 
          if( this.s2[j + PART_ZVEL] < 0.0){ 
              this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; }// need sign change--bounce!
          else {
              this.s2[j + PART_ZVEL] =  this.resti * this.s2[j + PART_ZVEL];}	// sign changed-- don't need another.

        }
        else{ 
          if( this.s2[j + PART_XPOS] - 0.75 <  (0.15 - this.s2[j + PART_YPOS])) {
          this.s2[j + PART_XPOS] = 0.75; // 1) resolve contact: put particle at wall.
          this.s2[j + PART_XVEL] -= this.s1[j + PART_XVEL]*6;	// 2a) undo velocity change:
          this.s2[j + PART_XVEL] *= this.drag;			        // 2b) apply drag:
          // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
          // ATTENTION! VERY SUBTLE PROBLEM HERE! 
          // need a velocity-sign test here that ensures the 'bounce' step will 
          // always send the ball outwards, away from its wall or floor collision. 
          if(this.s2[j + PART_XVEL] > 0.0) {
              this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];} // need sign change--bounce!
          else {
              this.s2[j + PART_XVEL] =  this.resti * this.s2[j + PART_XVEL];}
          }
          else{
            this.s2[j + PART_YPOS] = 0.15;// 1) resolve contact: put particle at wall.
            this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
            this.s2[j + PART_YVEL] *= this.drag;		          // 2b) apply drag:	
            // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
            // ATTENTION! VERY SUBTLE PROBLEM HERE!
            // need a velocity-sign test here that ensures the 'bounce' step will 
            // always send the ball outwards, away from its wall or floor collision.
            if(this.s2[j + PART_YVEL] < 0.0) 
                this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL]; // need sign change--bounce!
            else 
                this.s2[j + PART_YVEL] =  this.resti * this.s2[j + PART_YVEL];
          }
           }
      }

        

if((((this.s2[j + PART_XPOS] - 0.25)**2
+ (this.s2[j + PART_YPOS] - 0.15)**2 
+ (this.s2[j + PART_ZPOS] - 0.25)**2)**(1/2) < 0.25)
&& (((this.s2[j + PART_XPOS] - 0.25)**2
+ (this.s2[j + PART_YPOS] - 0.15)**2 
+ (this.s2[j + PART_ZPOS] - 0.25)**2)**(1/2) > 0.24)){
  tempX =  this.s2[j + PART_XPOS];
  tempY =  this.s2[j + PART_YPOS];
  tempZ =  this.s2[j + PART_ZPOS];
}

if(     (((this.s2[j + PART_XPOS] - 0.25)**2
+ (this.s2[j + PART_YPOS] - 0.15)**2 
+ (this.s2[j + PART_ZPOS] - 0.25)**2)**(1/2) < 0.25)){
  this.s2[j + PART_XPOS] = tempX;
  this.s2[j + PART_YPOS] = tempY;
  this.s2[j + PART_ZPOS] = tempZ;  
  this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
  this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
  this.s2[j + PART_XVEL] -= this.s1[j + PART_XVEL]*6;	// 2a) undo velocity change:
  this.s2[j + PART_XVEL] *= this.drag;			        // 2b) apply drag:
  this.s2[j + PART_YVEL] = this.s1[j + PART_YVEL];	// 2a) undo velocity change:
  this.s2[j + PART_YVEL] *= this.drag;			        // 2b) apply drag:

  if( this.s2[j + PART_ZVEL] < 0.0){ 
    this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; }// need sign change--bounce!
else {
    this.s2[j + PART_ZVEL] =  this.resti * this.s2[j + PART_ZVEL];}

    if(this.s2[j + PART_XVEL] < 0.0) {
      this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];} // need sign change--bounce!
  else {
      this.s2[j + PART_XVEL] =  this.resti * this.s2[j + PART_XVEL];}

      if(this.s2[j + PART_YVEL] < 0.0) {
        this.s2[j + PART_YVEL] = -this.resti * this.s2[j + PART_YVEL];} // need sign change--bounce!
    else {
        this.s2[j + PART_YVEL] =  this.resti * this.s2[j + PART_YVEL];}

}
      if((this.s2[j + PART_ZPOS] < 0.25) && this.s2[j + PART_XPOS] > 0.75 && this.s2[j + PART_YPOS] < 0.15) { // && this.s2[j + PART_ZVEL] < 0.0 ) {
        // collision! 
         if((0.25 - this.s2[j + PART_ZPOS]) < this.s2[j + PART_XPOS] - 0.75){
          this.s2[j + PART_ZPOS] = 0.25;// 1) resolve contact: put particle at wall.
          this.s2[j + PART_ZVEL] = this.s1[j + PART_ZVEL];  // 2a) undo velocity change:
          this.s2[j + PART_ZVEL] *= this.drag;			        // 2b) apply drag:
          
          // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
          // ATTENTION! VERY SUBTLE PROBLEM HERE! ------------------------------
          // need a velocity-sign test here that ensures the 'bounce' step will 
          // always send the ball outwards, away from its wall or floor collision. 
          if( this.s2[j + PART_ZVEL] < 0.0){ 
              this.s2[j + PART_ZVEL] = -this.resti * this.s2[j + PART_ZVEL]; }// need sign change--bounce!
          else {
              this.s2[j + PART_ZVEL] =  this.resti * this.s2[j + PART_ZVEL];}	// sign changed-- don't need another.

        }
        else{ 
          if( this.s2[j + PART_XPOS] - 0.75 <=  (0.15 - this.s2[j + PART_YPOS]))
          this.s2[j + PART_XPOS] = 0.75; // 1) resolve contact: put particle at wall.
          this.s2[j + PART_XVEL] -= this.s1[j + PART_XVEL]*6;	// 2a) undo velocity change:
          this.s2[j + PART_XVEL] *= this.drag;			        // 2b) apply drag:
          // 3) BOUNCE:  reversed velocity*coeff-of-restitution.
          // ATTENTION! VERY SUBTLE PROBLEM HERE! 
          // need a velocity-sign test here that ensures the 'bounce' step will 
          // always send the ball outwards, away from its wall or floor collision. 
          if(this.s2[j + PART_XVEL] > 0.0) {
              this.s2[j + PART_XVEL] = -this.resti * this.s2[j + PART_XVEL];} // need sign change--bounce!
          else {
              this.s2[j + PART_XVEL] =  this.resti * this.s2[j + PART_XVEL];}

           }
      }
      }
  	}
  }
	} // end of bounceType==1 
	else {
		console.log('?!?! unknown constraint: PartSys.bounceType==' + this.bounceType);
		return;
	}

//-----------------------------add 'age' constraint:
  if(this.isFountain == 1)  {  // When particle age falls to zero, re-initialize
                              // to re-launch from a randomized location with
                              // a randomized velocity and randomized age.
   if (this.isTor) {                      
  var j = 0;  // i==particle number; j==array index for i-th particle
  for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
    this.s2[j + PART_AGE] -= 1;     // decrement lifetime.
    if(this.s2[j + PART_AGE] <= 0) { // End of life: RESET this particle!
      this.roundRand();       // set this.randX,randY,randZ to random location in 
                              // a 3D unit sphere centered at the origin.
      //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
      // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
      this.s2[j + PART_XPOS] = -0.8 + 0.2*this.randX; 
      this.s2[j + PART_YPOS] = -0.8 + 0.2*this.randY;  
      this.s2[j + PART_ZPOS] = 1.8 + 0.2*this.randZ;
      this.s2[j + PART_WPOS] =  1.0;      // position 'w' coordinate;
      this.roundRand(); // Now choose random initial velocities too:
      this.s2[j + PART_XVEL] =  this.INIT_VEL*(0.0 + 0.2*this.randX);
      this.s2[j + PART_YVEL] =  this.INIT_VEL*(0.5 + 0.2*this.randY);
      this.s2[j + PART_ZVEL] =  this.INIT_VEL*(0.0 + 0.2*this.randZ);
      this.s2[j + PART_MASS] =  1.0;      // mass, in kg.
      this.s2[j + PART_DIAM] =  2.0 + 10*Math.random(); // on-screen diameter, in pixels
      this.s2[j + PART_RENDMODE] = 0.0;
      this.s2[j + PART_AGE] = 30 + 100*Math.random();
      
      } // if age <=0
  } // for loop thru all particles

  
   }
   
   if (this.isFire) {                      
    var j = 0;  // i==particle number; j==array index for i-th particle
    for(var i = 0; i < this.partCount; i += 1, j+= PART_MAXVAR) {
      this.s2[j + PART_AGE] -= 2;     // decrement lifetime.
      if(this.s2[j + PART_AGE] <= 0) { // End of life: RESET this particle!
        this.roundRand();       // set this.randX,randY,randZ to random location in 
                                // a 3D unit sphere centered at the origin.
        //all our bouncy-balls stay within a +/- 0.9 cube centered at origin; 
        // set random positions in a 0.1-radius ball centered at (-0.8,-0.8,-0.8)
        this.s2[j + PART_XPOS] = -0 + 0.2*this.randX; 
        this.s2[j + PART_YPOS] = -0 + 0.2*this.randY;  
        this.s2[j + PART_ZPOS] = 1.2 + 0.2*this.randZ;
        this.s2[j + PART_WPOS] =  1.0;      // position 'w' coordinate;
        this.roundRand(); // Now choose random initial velocities too:
        this.s2[j + PART_XVEL] =  this.INIT_VEL*(0.1 + 0.2*this.randX);
        this.s2[j + PART_YVEL] =  this.INIT_VEL*(0.1 + 0.2*this.randY);
        this.s2[j + PART_ZVEL] =  this.INIT_VEL*(0.5 + 0.2*this.randZ);
        this.s2[j + PART_MASS] =  1.0;      // mass, in kg.
        this.s2[j + PART_DIAM] =  2.0 + 10*Math.random(); // on-screen diameter, in pixels
        this.s2[j + PART_RENDMODE] = 0.0;
        this.s2[j + PART_AGE] = 50 + 100*Math.random();
        } // if age <=0
    } // for loop thru all particles
     }
}
}

PartSys.prototype.swap = function() {
//==============================================================================
// Choose the method you want:
this.s0.set(this.s1);

// We can EXCHANGE, actually SWAP the contents of s1 and s2, like this:  
// but !! YOU PROBABLY DON'T WANT TO DO THIS !!
/*
  var tmp = this.s1;
  this.s1 = this.s2;
  this.s2 = tmp;
*/

// Or we can REPLACE s1 contents with s2 contents, like this:
// NOTE: if we try:  this.s1 = this.s2; we DISCARD s1's memory!!

  this.s1.set(this.s2);     // set values of s1 array to match s2 array.
// (WHY? so that your solver can make intermittent changes to particle
// values without any unwanted 'old' values re-appearing. For example,
// At timestep 36, particle 11 had 'red' color in s1, and your solver changes
// its color to blue in s2, but makes no further changes.  If swap() EXCHANGES 
// s1 and s2 contents, on timestep 37 the particle is blue, but on timestep 38
// the particle is red again!  If we REPLACE s1 contents with s2 contents, the
// particle is red at time step 36, but blue for 37, 38, 39 and all further
// timesteps until we change it again.
// REPLACE s1 contents with s2 contents:
}
/*
function makeGroundGrid() {
	//==============================================================================
	// Create a list of vertices that create a large grid of lines in the x,y plane
	// centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
	
		var xcount = 100;			// # of lines to draw in x,y to make the grid.
		var ycount = 100;		
		var xymax	= 10.0;			// grid size; extends to cover +/-xymax in x and y.
		 var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
		 var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.

		// Create an (global) array to hold this ground-plane's vertices:
		gndVerts = new Float32Array(PART_MAXVAR*2*(xcount+ycount));
							// draw a grid made of xcount+ycount lines; 2 vertices per line.
							
		var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
		var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
	  	
		// First, step thru x values as we make vertical lines of constant-x:
		for(v=0, j=0; v<2*xcount; v++, j+= PART_MAXVAR) {
			if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
				gndVerts[j+ PART_XPOS] = -xymax + (v  )*xgap;	// x
				gndVerts[j+ PART_YPOS] = -xymax;								// y
				gndVerts[j+ PART_ZPOS] = 0.0;									// z
				gndVerts[j+ PART_WPOS] = 1.0;									// w.
			}
			else {				// put odd-numbered vertices at (xnow, +xymax, 0).
				gndVerts[j+ PART_XPOS] = -xymax + (v-1)*xgap;	// x
				gndVerts[j+ PART_YPOS] = xymax;								// y
        gndVerts[j+ PART_ZPOS] = 0.0;									// z
				gndVerts[j+ PART_WPOS] = 1.0;									// w.
			}
			gndVerts[j+ PART_R]  = xColr[0];			// red
			gndVerts[j+ PART_G]  = xColr[1];			// grn
			gndVerts[j+ PART_B]  = xColr[2];			// blu
		}
		// Second, step thru y values as wqe make horizontal lines of constant-y:
		// (don't re-initialize j--we're adding more vertices to the array)
		for(v=0; v<2*ycount; v++, j+= PART_MAXVAR) {
			if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
				gndVerts[j+ PART_XPOS] = -xymax;								// x
				gndVerts[j+ PART_YPOS] = -xymax + (v  )*ygap;	// y
				gndVerts[j+ PART_ZPOS] = 0.0;									// z
				gndVerts[j+ PART_WPOS] = 1.0;									// w.
			}
			else {					// put odd-numbered vertices at (+xymax, ynow, 0).
				gndVerts[j+ PART_XPOS] = xymax;								// x
				gndVerts[j+ PART_YPOS] = -xymax + (v-1)*ygap;	// y
				gndVerts[j+ PART_ZPOS] = 0.0;									// z
				gndVerts[j+ PART_WPOS] = 1.0;									// w.
			}   
			gndVerts[j+ PART_R] = yColr[0];			// red
			gndVerts[j+ PART_G] = yColr[1];			// grn
			gndVerts[j+ PART_B] = yColr[2];			// blu
		}


	}

*/function makeGroundGrid() {
  //==============================================================================
  // Create a list of vertices that create a large grid of lines in the x,y plane
  // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
  
  var xcount = 100;			// # of lines to draw in x,y to make the grid.
  var ycount = 100;		
  var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
  var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
  var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
   
  // Create an (global) array to hold this ground-plane's vertices:
  gndVerts = new Float32Array(7.00*2*(xcount+ycount));
            // draw a grid made of xcount+ycount lines; 2 vertices per line.
            
  var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
  var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
  
  // First, step thru x values as we make vertical lines of constant-x:
  for(v=0, j=0; v<2*xcount; v++, j+= 7.00) {
    if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
      gndVerts[j  ] = -xymax + (v  )*xgap;	// x
      gndVerts[j+1] = -xymax;								// y
      gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;									// w.
    }
    else {				// put odd-numbered vertices at (xnow, +xymax, 0).
      gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
      gndVerts[j+1] = xymax;								// y
      gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;									// w.
    }
    gndVerts[j+4] = xColr[0];			// red
    gndVerts[j+5] = xColr[1];			// grn
    gndVerts[j+6] = xColr[2];			// blu
  }
  // Second, step thru y values as wqe make horizontal lines of constant-y:
  // (don't re-initialize j--we're adding more vertices to the array)
  for(v=0; v<2*ycount; v++, j+= 7.00) {
    if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
      gndVerts[j  ] = -xymax;								// x
      gndVerts[j+1] = -xymax + (v  )*ygap;	// y
      gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;									// w.
    }
    else {					// put odd-numbered vertices at (+xymax, ynow, 0).
      gndVerts[j  ] = xymax;								// x
      gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
      gndVerts[j+2] = 0.0;									// z
      gndVerts[j+3] = 1.0;									// w.
    }
    gndVerts[j+4] = yColr[0];			// red
    gndVerts[j+5] = yColr[1];			// grn
    gndVerts[j+6] = yColr[2];			// blu
  }
}