"""Landmark-driven facial sculpt. A continuous surface with eye sockets,
zygomatic planes, nasal bridge/alar wings, philtrum, lip mound and chin.
The sampled front surface is the sole fitting source for runtime eyelids.
"""
import math,json,os
PROFILE=[(-.155,.008,.025,.027),(-.145,.035,.046,.029),(-.13,.063,.072,.023),(-.108,.085,.09,.017),(-.083,.108,.105,.010),(-.053,.128,.119,.004),(-.022,.140,.129,0),(.015,.145,.134,-.002),(.05,.146,.135,-.004),(.09,.142,.129,-.009),(.135,.119,.11,-.018),(.175,.081,.076,-.024),(.202,.023,.027,-.026),(.207,.002,.003,-.026)]
def gaussian(x,y,cx,cy,sx,sy):return math.exp(-((x-cx)/sx)**2-((y-cy)/sy)**2)
def section(y):
 for i in range(len(PROFILE)-1):
  a,b=PROFILE[i],PROFILE[i+1]
  if a[0]<=y<=b[0]:
   t=(y-a[0])/(b[0]-a[0]);p0=PROFILE[max(0,i-1)];p3=PROFILE[min(len(PROFILE)-1,i+2)];span=b[0]-a[0]
   h00=2*t*t*t-3*t*t+1;h10=t*t*t-2*t*t+t;h01=-2*t*t*t+3*t*t;h11=t*t*t-t*t
   return [h00*a[k]+h10*span*(b[k]-p0[k])/(b[0]-p0[0])+h01*b[k]+h11*span*(p3[k]-a[k])/(p3[0]-a[0]) for k in range(1,4)]
 return list(PROFILE[0 if y<PROFILE[0][0] else -1][1:])
def sculpt_depth(x,y):
 w,d,z=section(y);base=z+d*math.sqrt(max(.001,1-(x/w)**2))
 cheek=.005*(gaussian(x,y,-.094,-.035,.032,.025)+gaussian(x,y,.094,-.035,.032,.025))
 sockets=-.009*(gaussian(x,y,-.066,.018,.044,.026)+gaussian(x,y,.066,.018,.044,.026))
 bridge=.009*gaussian(x,y,0,.002,.014,.040)
 tip=.018*gaussian(x,y,0,-.032,.014,.012)
 alar=.004*(gaussian(x,y,-.012,-.039,.009,.008)+gaussian(x,y,.012,-.039,.009,.008))
 philtrum=.0025*gaussian(x,y,0,-.061,.007,.015)
 lips=.004*gaussian(x,y,0,-.084,.027,.010)
 chin=.004*gaussian(x,y,0,-.120,.035,.018)
 return base+cheek+sockets+bridge+tip+alar+philtrum+lips+chin

def build_portrait(mesh,skin,out):
 vs=[];fs=[];N=80;R=94
 for i in range(R+1):
  y=-.155+i*.362/R;w,d,z=section(y)
  for j in range(N):
   a=j*math.tau/N;x=math.sin(a)*w;front=math.cos(a);depth=z+front*d
   if front>0:depth+=(sculpt_depth(x,y)-(z+d*math.sqrt(max(.001,1-(x/w)**2))))
   vs.append((x,y,depth))
   if i:
    q=(i-1)*N+j;b=(i-1)*N+(j+1)%N;fs.append((q,b,b+N,q+N))
 fs.extend([tuple(reversed(range(N))),tuple(R*N+j for j in range(N))])
 face=mesh('Landmark sculpt • Celestia face',vs,fs,skin,0)
 # This is also a source handoff: fitting data changes with the sculpt.
 nx,ny=81,91;x0,x1=-.16,.16;y0,y1=-.16,.21
 samples=[round(sculpt_depth(x0+i*(x1-x0)/(nx-1),y0+j*(y1-y0)/(ny-1)),7) for j in range(ny) for i in range(nx)]
 with open(os.path.join(out,'portrait.json'),'w') as f:json.dump({'schemaVersion':1,'nx':nx,'ny':ny,'bounds':[x0,y0,x1,y1],'depth':samples},f,separators=(',',':'))
 return face
